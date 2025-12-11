// =============================================================================
// GRAPH DATA BUILDER — Builds graph data from stores for visualization
// =============================================================================
// This is a READ-ONLY projection of the store data. Never mutates stores.
// Generates nodes and links for an Obsidian-style knowledge graph visualization.
// =============================================================================

import type { Contact, Note, Topic, Task, Interaction } from '../../types';
import type { FrameScanReport } from '../frameScanReportStore';
import { CONTACT_ZERO } from '../contactStore';

// =============================================================================
// TYPES
// =============================================================================

export type GraphNodeType =
  | 'contact'
  | 'contact_zero'
  | 'note'
  | 'topic'
  | 'task'
  | 'interaction'
  | 'framescan';

export interface FrameGraphNode {
  id: string;                 // unique stable id
  type: GraphNodeType;
  label: string;
  subLabel?: string;
  contactId?: string;
  noteId?: string;
  topicSlug?: string;
  taskId?: string;
  interactionId?: string;
  frameScanId?: string;
  importance?: number;        // for node size and maxNodes trimming
  group?: string;             // for color grouping
}

export type GraphLinkType =
  | 'contact_note'
  | 'contact_task'
  | 'contact_interaction'
  | 'contact_topic'
  | 'contact_framescan'
  | 'note_topic'
  | 'note_note'
  | 'note_contact_mention'
  | 'note_framescan'
  | 'interaction_framescan'
  | 'contact_contact'
  | 'contact_zero_edge';

export interface FrameGraphLink {
  id: string;
  source: string;
  target: string;
  type: GraphLinkType;
}

export interface FrameGraphData {
  nodes: FrameGraphNode[];
  links: FrameGraphLink[];
}

export interface FrameGraphBuildOptions {
  focusContactId?: string;      // for local graph view
  maxNodes?: number;
  maxDepth?: number;            // hop depth from focus node
}

// =============================================================================
// IMPORTANCE CALCULATION
// =============================================================================

/**
 * Calculate importance score for a node based on connections and recency.
 * Higher importance = larger nodes, prioritized when trimming by maxNodes.
 */
const calculateNodeImportance = (
  nodeId: string,
  nodeType: GraphNodeType,
  connections: number,
  lastActivity?: string
): number => {
  let base = 1;

  // Type-based base importance
  if (nodeType === 'contact_zero') base = 100;
  else if (nodeType === 'contact') base = 10;
  else if (nodeType === 'note') base = 5;
  else if (nodeType === 'topic') base = 3;
  else if (nodeType === 'framescan') base = 8;
  else if (nodeType === 'task') base = 4;
  else if (nodeType === 'interaction') base = 2;

  // Connection multiplier
  const connectionBonus = Math.min(connections * 0.5, 10);

  // Recency bonus (decay over time)
  let recencyBonus = 0;
  if (lastActivity) {
    const daysSinceActivity = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActivity < 7) recencyBonus = 5;
    else if (daysSinceActivity < 30) recencyBonus = 3;
    else if (daysSinceActivity < 90) recencyBonus = 1;
  }

  return base + connectionBonus + recencyBonus;
};

// =============================================================================
// LINK CREATION HELPERS
// =============================================================================

const createLink = (source: string, target: string, type: GraphLinkType): FrameGraphLink => ({
  id: `${source}-${target}-${type}`,
  source,
  target,
  type,
});

// =============================================================================
// WIKILINK AND MENTION PARSING
// =============================================================================

/**
 * Extract [[wikilinks]] from text content
 */
const extractWikilinks = (content: string): string[] => {
  const regex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const label = match[1].trim();
    if (label && !links.includes(label)) {
      links.push(label);
    }
  }

  return links;
};

/**
 * Extract @mentions from text content
 */
const extractMentions = (content: string): string[] => {
  const regex = /@([a-zA-Z0-9_]+)/g;
  const mentions: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const mention = match[1].trim();
    if (mention && !mentions.includes(mention)) {
      mentions.push(mention);
    }
  }

  return mentions;
};

/**
 * Normalize title for matching (lowercase, trim)
 */
const normalizeTitle = (title: string): string => title.trim().toLowerCase();

// =============================================================================
// MAIN BUILD FUNCTION
// =============================================================================

export const buildFrameGraphData = (
  contacts: Contact[],
  notes: Note[],
  topics: Topic[],
  tasks: Task[],
  interactions: Interaction[],
  frameScanReports: FrameScanReport[],
  options: FrameGraphBuildOptions = {}
): FrameGraphData => {
  const {
    focusContactId,
    maxNodes = 500,
    maxDepth = 3,
  } = options;

  const nodes: FrameGraphNode[] = [];
  const links: FrameGraphLink[] = [];
  const nodeIds = new Set<string>();
  const linkIds = new Set<string>();

  // Helper to add node
  const addNode = (node: FrameGraphNode) => {
    if (!nodeIds.has(node.id)) {
      nodes.push(node);
      nodeIds.add(node.id);
    }
  };

  // Helper to add link
  const addLink = (link: FrameGraphLink) => {
    if (!linkIds.has(link.id)) {
      links.push(link);
      linkIds.add(link.id);
    }
  };

  // =============================================================================
  // 1. CREATE CONTACT ZERO NODE (always central)
  // =============================================================================

  const contactZero = contacts.find(c => c.id === CONTACT_ZERO.id) || CONTACT_ZERO;
  addNode({
    id: contactZero.id,
    type: 'contact_zero',
    label: contactZero.fullName || 'You',
    subLabel: 'Contact Zero',
    contactId: contactZero.id,
    importance: 100,
    group: 'self',
  });

  // =============================================================================
  // 2. CREATE CONTACT NODES
  // =============================================================================

  contacts.forEach(contact => {
    if (contact.id === CONTACT_ZERO.id) return; // Already added
    if (contact.status === 'archived') return; // Skip archived

    const connectionCount =
      notes.filter(n => n.targetContactIds?.includes(contact.id) || n.contactId === contact.id).length +
      tasks.filter(t => t.contactId === contact.id).length +
      interactions.filter(i => i.contactId === contact.id).length;

    addNode({
      id: contact.id,
      type: 'contact',
      label: contact.fullName,
      subLabel: contact.relationshipRole,
      contactId: contact.id,
      importance: calculateNodeImportance(
        contact.id,
        'contact',
        connectionCount,
        contact.lastContactAt || contact.frame.lastScanAt || undefined
      ),
      group: contact.relationshipDomain,
    });
  });

  // =============================================================================
  // 3. CREATE NOTE NODES
  // =============================================================================

  notes.forEach(note => {
    if (note.isArchived) return; // Skip archived

    const noteTitle = note.title || 'Untitled';
    const connectionCount =
      (note.targetContactIds?.length || 0) +
      (note.topics?.length || 0) +
      (note.mentions?.length || 0);

    addNode({
      id: note.id,
      type: 'note',
      label: noteTitle,
      subLabel: note.kind,
      noteId: note.id,
      importance: calculateNodeImportance(
        note.id,
        'note',
        connectionCount,
        note.updatedAt
      ),
      group: note.folderId || 'inbox',
    });
  });

  // =============================================================================
  // 4. CREATE TOPIC NODES
  // =============================================================================

  topics.forEach(topic => {
    const connectionCount = (topic.noteIds?.length || 0) + (topic.contactIds?.length || 0);

    addNode({
      id: topic.id,
      type: 'topic',
      label: topic.label,
      subLabel: `${topic.noteIds?.length || 0} notes`,
      topicSlug: topic.slug,
      importance: calculateNodeImportance(
        topic.id,
        'topic',
        connectionCount,
        topic.updatedAt
      ),
      group: 'topic',
    });
  });

  // =============================================================================
  // 5. CREATE TASK NODES
  // =============================================================================

  tasks.forEach(task => {
    if (task.status === 'done') return; // Skip completed tasks

    addNode({
      id: task.id,
      type: 'task',
      label: task.title,
      subLabel: task.status,
      taskId: task.id,
      importance: calculateNodeImportance(
        task.id,
        'task',
        1, // Tasks have one connection to contact
        task.dueAt || task.createdAt
      ),
      group: task.status,
    });
  });

  // =============================================================================
  // 6. CREATE INTERACTION NODES
  // =============================================================================

  interactions.forEach(interaction => {
    addNode({
      id: interaction.id,
      type: 'interaction',
      label: `${interaction.type}`,
      subLabel: new Date(interaction.occurredAt).toLocaleDateString(),
      interactionId: interaction.id,
      importance: calculateNodeImportance(
        interaction.id,
        'interaction',
        1,
        interaction.occurredAt
      ),
      group: interaction.type,
    });
  });

  // =============================================================================
  // 7. CREATE FRAMESCAN NODES
  // =============================================================================

  frameScanReports.forEach(report => {
    const frameScoreLabel = Math.round(report.score.frameScore).toString();

    addNode({
      id: report.id,
      type: 'framescan',
      label: report.title || 'FrameScan',
      subLabel: `Score: ${frameScoreLabel}`,
      frameScanId: report.id,
      importance: calculateNodeImportance(
        report.id,
        'framescan',
        report.subjectContactIds.length,
        report.createdAt
      ),
      group: report.score.overallFrame,
    });
  });

  // =============================================================================
  // 8. CREATE EDGES FROM STRUCTURED FIELDS
  // =============================================================================

  // Contact Zero → All contacts with relationships
  contacts.forEach(contact => {
    if (contact.id === CONTACT_ZERO.id) return;
    if (contact.status === 'archived') return;

    // Any contact that has notes, tasks, or interactions gets an edge to Contact Zero
    const hasRelationship =
      notes.some(n => n.targetContactIds?.includes(contact.id) || n.contactId === contact.id) ||
      tasks.some(t => t.contactId === contact.id) ||
      interactions.some(i => i.contactId === contact.id);

    if (hasRelationship) {
      addLink(createLink(CONTACT_ZERO.id, contact.id, 'contact_zero_edge'));
    }
  });

  // Note → Contact (targetContactIds)
  notes.forEach(note => {
    if (note.isArchived) return;

    // Link to target contacts
    note.targetContactIds?.forEach(contactId => {
      if (nodeIds.has(contactId) && nodeIds.has(note.id)) {
        addLink(createLink(note.id, contactId, 'contact_note'));
      }
    });

    // Legacy: contactId field
    if (note.contactId && nodeIds.has(note.contactId) && nodeIds.has(note.id)) {
      addLink(createLink(note.id, note.contactId, 'contact_note'));
    }
  });

  // Note → Topic
  notes.forEach(note => {
    if (note.isArchived) return;

    note.topics?.forEach(topicId => {
      if (nodeIds.has(topicId) && nodeIds.has(note.id)) {
        addLink(createLink(note.id, topicId, 'note_topic'));
      }
    });
  });

  // Contact → Topic (via topic.contactIds)
  topics.forEach(topic => {
    topic.contactIds?.forEach(contactId => {
      if (nodeIds.has(contactId) && nodeIds.has(topic.id) && contactId !== CONTACT_ZERO.id) {
        addLink(createLink(contactId, topic.id, 'contact_topic'));
      }
    });
  });

  // Task → Contact
  tasks.forEach(task => {
    if (task.status === 'done') return;
    if (nodeIds.has(task.contactId) && nodeIds.has(task.id)) {
      addLink(createLink(task.id, task.contactId, 'contact_task'));
    }
  });

  // Interaction → Contact
  interactions.forEach(interaction => {
    if (nodeIds.has(interaction.contactId) && nodeIds.has(interaction.id)) {
      addLink(createLink(interaction.id, interaction.contactId, 'contact_interaction'));
    }
  });

  // FrameScan → Contact
  frameScanReports.forEach(report => {
    report.subjectContactIds.forEach(contactId => {
      if (nodeIds.has(contactId) && nodeIds.has(report.id)) {
        addLink(createLink(report.id, contactId, 'contact_framescan'));
      }
    });

    // FrameScan → Note (if sourceRef is a note ID)
    if (report.sourceRef && nodeIds.has(report.sourceRef) && nodeIds.has(report.id)) {
      const sourceNode = nodes.find(n => n.id === report.sourceRef);
      if (sourceNode?.type === 'note') {
        addLink(createLink(report.id, report.sourceRef, 'note_framescan'));
      }
    }
  });

  // =============================================================================
  // 9. CREATE EDGES FROM OBSIDIAN-STYLE LINKS
  // =============================================================================

  // Note → Note via [[wikilinks]]
  notes.forEach(sourceNote => {
    if (sourceNote.isArchived) return;

    const content = sourceNote.content || '';
    const wikilinks = extractWikilinks(content);

    wikilinks.forEach(linkTitle => {
      const normalizedLink = normalizeTitle(linkTitle);
      const targetNote = notes.find(n =>
        !n.isArchived &&
        n.title &&
        normalizeTitle(n.title) === normalizedLink
      );

      if (targetNote && nodeIds.has(sourceNote.id) && nodeIds.has(targetNote.id)) {
        addLink(createLink(sourceNote.id, targetNote.id, 'note_note'));
      }
    });
  });

  // Note → Contact via @mentions
  notes.forEach(note => {
    if (note.isArchived) return;

    // Use mentions array if available
    note.mentions?.forEach(contactId => {
      if (nodeIds.has(contactId) && nodeIds.has(note.id)) {
        addLink(createLink(note.id, contactId, 'note_contact_mention'));
      }
    });

    // Also parse content for @mentions (legacy)
    const content = note.content || '';
    const mentions = extractMentions(content);

    mentions.forEach(mentionName => {
      const contact = contacts.find(c =>
        c.fullName.toLowerCase().includes(mentionName.toLowerCase())
      );

      if (contact && nodeIds.has(contact.id) && nodeIds.has(note.id)) {
        addLink(createLink(note.id, contact.id, 'note_contact_mention'));
      }
    });
  });

  // =============================================================================
  // 10. APPLY FOCUS AND MAXNODES FILTERS
  // =============================================================================

  let finalNodes = nodes;
  let finalLinks = links;

  // If focusContactId is specified, filter to local graph
  if (focusContactId && maxDepth) {
    const visited = new Set<string>();
    const queue: { id: string; depth: number }[] = [{ id: focusContactId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;

      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);

      // Add neighbors
      links.forEach(link => {
        if (link.source === id && !visited.has(link.target)) {
          queue.push({ id: link.target, depth: depth + 1 });
        }
        if (link.target === id && !visited.has(link.source)) {
          queue.push({ id: link.source, depth: depth + 1 });
        }
      });
    }

    // Always include Contact Zero
    visited.add(CONTACT_ZERO.id);

    finalNodes = nodes.filter(n => visited.has(n.id));
    finalLinks = links.filter(l => visited.has(l.source) && visited.has(l.target));
  }

  // Apply maxNodes limit by importance
  if (maxNodes && finalNodes.length > maxNodes) {
    // Always keep Contact Zero
    const contactZeroNode = finalNodes.find(n => n.type === 'contact_zero');

    // Sort by importance and take top nodes
    const sortedNodes = finalNodes
      .filter(n => n.type !== 'contact_zero')
      .sort((a, b) => (b.importance || 0) - (a.importance || 0))
      .slice(0, maxNodes - 1);

    // Add Contact Zero back
    if (contactZeroNode) {
      sortedNodes.unshift(contactZeroNode);
    }

    const keptNodeIds = new Set(sortedNodes.map(n => n.id));
    finalNodes = sortedNodes;
    finalLinks = finalLinks.filter(l => keptNodeIds.has(l.source) && keptNodeIds.has(l.target));
  }

  return {
    nodes: finalNodes,
    links: finalLinks,
  };
};
