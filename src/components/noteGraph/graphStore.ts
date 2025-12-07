import { useMemo, DependencyList } from 'react';
import { Contact, Note, Topic } from '../../types';
import { getAllNotes, getNoteLinks } from '../../services/noteStore';
import { getAllTopics, getTopicsForNote, getOrCreateTopic } from '../../services/topicStore';
import { getAllContacts } from '../../services/contactStore';

export type GraphNodeType = 'note' | 'topic' | 'contact';

export interface GraphNode {
  id: string;           // underlying entity id
  type: GraphNodeType;  // "note" | "topic" | "contact"
  label: string;        // note title, topic name, contact name
  linkCount: number;    // degree
}

export interface GraphEdge {
  id: string;
  source: string;  // node id
  target: string;  // node id
}

export interface NoteGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

type TopicLike = Topic & { ephemeral?: boolean };

const normalizeLabel = (label: string): string =>
  label.trim().toLowerCase();

const slugify = (label: string): string =>
  normalizeLabel(label)
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/-+/g, '-');

const deriveNoteLabel = (note: Note): string =>
  note.title?.trim() ||
  (note.content.split('\n')[0]?.trim() || 'Untitled');

const extractHashtagTopics = (content: string): string[] => {
  const matches = content.match(/#([A-Za-z0-9_-]+)/g) || [];
  return Array.from(new Set(matches.map(m => m.replace('#', '')).filter(Boolean)));
};

const collectTagTopics = (note: Note): string[] => {
  const tagList = note.tags || [];
  return tagList.map(t => t.replace(/^#/, '').trim()).filter(Boolean);
};

export const buildNoteGraphData = (): NoteGraphData => {
  const notes = getAllNotes();
  const topics = getAllTopics();
  const contacts = getAllContacts(true);
  const noteLinks = getNoteLinks();

  const topicBySlug = new Map<string, TopicLike>();
  topics.forEach(t => topicBySlug.set(t.slug, t));

  const nodesMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphEdge>();
  const degree = new Map<string, number>();

  const ensureNode = (id: string, type: GraphNodeType, label: string) => {
    if (!nodesMap.has(id)) {
      nodesMap.set(id, { id, type, label, linkCount: 0 });
    }
  };

  const bumpDegree = (id: string) => {
    degree.set(id, (degree.get(id) || 0) + 1);
  };

  const addEdge = (a: string, b: string) => {
    if (a === b) return;
    const key = [a, b].sort().join('::');
    if (!edgeMap.has(key)) {
      edgeMap.set(key, { id: key, source: a, target: b });
      bumpDegree(a);
      bumpDegree(b);
    }
  };

  // Contacts
  contacts.forEach((contact: Contact) => {
    ensureNode(contact.id, 'contact', contact.fullName);
  });

  // Topics (existing)
  topics.forEach((topic: Topic) => {
    ensureNode(topic.id, 'topic', topic.label);
  });

  // Notes and their relationships
  notes.forEach((note: Note) => {
    ensureNode(note.id, 'note', deriveNoteLabel(note));

    // Note -> Contact edge
    addEdge(note.id, note.contactId);

    // Topics linked to this note from store
    const storeTopics = getTopicsForNote(note.id);
    storeTopics.forEach((topic) => {
      ensureNode(topic.id, 'topic', topic.label);
      addEdge(note.id, topic.id);
      addEdge(topic.id, note.contactId);
    });

    // Extra topics from hashtags / tags
    const inlineTopicLabels = [
      ...extractHashtagTopics(note.content),
      ...collectTagTopics(note),
    ];
    inlineTopicLabels.forEach((label) => {
      const slug = slugify(label);
      let topic = topicBySlug.get(slug);
      if (!topic) {
        // Create ephemeral topic node, but also push into store once to stabilize ids
        topic = getOrCreateTopic(label);
        topicBySlug.set(slug, topic);
      }
      ensureNode(topic.id, 'topic', topic.label);
      addEdge(note.id, topic.id);
      addEdge(topic.id, note.contactId);
    });
  });

  // Note ↔ Note edges from [[note]] links (stored)
  noteLinks.forEach((link) => {
    addEdge(link.sourceNoteId, link.targetNoteId);
  });

  // Apply degree to nodes
  nodesMap.forEach((node) => {
    node.linkCount = degree.get(node.id) || 0;
  });

  return {
    nodes: Array.from(nodesMap.values()),
    edges: Array.from(edgeMap.values()),
  };
};

export const useNoteGraphData = (deps: DependencyList = []): NoteGraphData => {
  return useMemo(() => buildNoteGraphData(), deps);
};
