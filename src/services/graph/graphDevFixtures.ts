// =============================================================================
// GRAPH DEV FIXTURES — Sample graph data for development and testing
// =============================================================================
// Provides synthetic graph data when stores are empty.
// DO NOT persist to real stores - purely for rendering demos.
// =============================================================================

import type { FrameGraphData, FrameGraphNode, FrameGraphLink } from './graphDataBuilder';

/**
 * Generate sample graph data for development
 */
export const createSampleGraphData = (): FrameGraphData => {
  const nodes: FrameGraphNode[] = [];
  const links: FrameGraphLink[] = [];

  // Contact Zero (always central)
  nodes.push({
    id: 'contact_zero',
    type: 'contact_zero',
    label: 'You',
    subLabel: 'Contact Zero',
    contactId: 'contact_zero',
    importance: 100,
    group: 'self',
  });

  // Contacts
  const contacts = [
    { id: 'c1', label: 'Sarah Chen', role: 'VP Engineering', domain: 'business' },
    { id: 'c2', label: 'Marcus Johnson', role: 'CTO', domain: 'business' },
    { id: 'c3', label: 'Elena Rodriguez', role: 'Co-Founder', domain: 'business' },
    { id: 'c4', label: 'David Kim', role: 'Investor', domain: 'hybrid' },
    { id: 'c5', label: 'James Wilson', role: 'Friend', domain: 'personal' },
    { id: 'c6', label: 'Lisa Park', role: 'Family', domain: 'personal' },
    { id: 'c7', label: 'Amanda Torres', role: 'Designer', domain: 'hybrid' },
    { id: 'c8', label: 'Robert Chen', role: 'Prospect', domain: 'business' },
    { id: 'c9', label: 'Jennifer Lee', role: 'Client', domain: 'business' },
    { id: 'c10', label: 'Michael Brown', role: 'Partner', domain: 'business' },
  ];

  contacts.forEach((contact, i) => {
    nodes.push({
      id: contact.id,
      type: 'contact',
      label: contact.label,
      subLabel: contact.role,
      contactId: contact.id,
      importance: 10 + i,
      group: contact.domain,
    });

    // Link all contacts to Contact Zero
    links.push({
      id: `cz-${contact.id}`,
      source: 'contact_zero',
      target: contact.id,
      type: 'contact_zero_edge',
    });
  });

  // Notes
  const notes = [
    { id: 'n1', title: 'Sales Strategy Meeting', contacts: ['c1', 'c2'], topics: ['t1'] },
    { id: 'n2', title: 'Product Roadmap Discussion', contacts: ['c2'], topics: ['t2', 't3'] },
    { id: 'n3', title: 'Partnership Agreement Draft', contacts: ['c3'], topics: ['t1'] },
    { id: 'n4', title: 'Investor Update Q4', contacts: ['c4'], topics: ['t4'] },
    { id: 'n5', title: 'Personal Goals for 2026', contacts: [], topics: ['t5'] },
    { id: 'n6', title: 'Team Building Ideas', contacts: ['c1', 'c3'], topics: ['t6'] },
    { id: 'n7', title: 'Customer Feedback Analysis', contacts: ['c9'], topics: ['t2'] },
    { id: 'n8', title: 'Marketing Campaign Notes', contacts: ['c8'], topics: ['t1', 't7'] },
    { id: 'n9', title: 'Design System Review', contacts: ['c7'], topics: ['t3'] },
    { id: 'n10', title: 'Birthday Party Planning', contacts: ['c6'], topics: [] },
  ];

  notes.forEach((note, i) => {
    nodes.push({
      id: note.id,
      type: 'note',
      label: note.title,
      subLabel: 'note',
      noteId: note.id,
      importance: 5 + i * 0.5,
      group: 'inbox',
    });

    // Link notes to contacts
    note.contacts.forEach(contactId => {
      links.push({
        id: `${note.id}-${contactId}`,
        source: note.id,
        target: contactId,
        type: 'contact_note',
      });
    });

    // Link notes to topics
    note.topics.forEach(topicId => {
      links.push({
        id: `${note.id}-${topicId}`,
        source: note.id,
        target: topicId,
        type: 'note_topic',
      });
    });
  });

  // Note-to-note wikilinks
  links.push(
    { id: 'n1-n2-link', source: 'n1', target: 'n2', type: 'note_note' },
    { id: 'n2-n3-link', source: 'n2', target: 'n3', type: 'note_note' },
    { id: 'n4-n5-link', source: 'n4', target: 'n5', type: 'note_note' },
    { id: 'n6-n1-link', source: 'n6', target: 'n1', type: 'note_note' }
  );

  // Topics
  const topics = [
    { id: 't1', label: 'Sales', noteCount: 3 },
    { id: 't2', label: 'Product', noteCount: 2 },
    { id: 't3', label: 'Engineering', noteCount: 2 },
    { id: 't4', label: 'Fundraising', noteCount: 1 },
    { id: 't5', label: 'Personal Development', noteCount: 1 },
    { id: 't6', label: 'Team Culture', noteCount: 1 },
    { id: 't7', label: 'Marketing', noteCount: 1 },
  ];

  topics.forEach((topic, i) => {
    nodes.push({
      id: topic.id,
      type: 'topic',
      label: topic.label,
      subLabel: `${topic.noteCount} notes`,
      topicSlug: topic.label.toLowerCase(),
      importance: 3 + topic.noteCount,
      group: 'topic',
    });
  });

  // Tasks
  const tasks = [
    { id: 'tk1', title: 'Follow up with Sarah', contact: 'c1' },
    { id: 'tk2', title: 'Prepare Q1 roadmap', contact: 'c2' },
    { id: 'tk3', title: 'Review partnership terms', contact: 'c3' },
    { id: 'tk4', title: 'Send investor update', contact: 'c4' },
    { id: 'tk5', title: 'Schedule coffee with James', contact: 'c5' },
    { id: 'tk6', title: 'Buy birthday gift', contact: 'c6' },
  ];

  tasks.forEach((task, i) => {
    nodes.push({
      id: task.id,
      type: 'task',
      label: task.title,
      subLabel: 'open',
      taskId: task.id,
      importance: 4 + i * 0.3,
      group: 'open',
    });

    links.push({
      id: `${task.id}-${task.contact}`,
      source: task.id,
      target: task.contact,
      type: 'contact_task',
    });
  });

  // Interactions
  const interactions = [
    { id: 'int1', type: 'call', contact: 'c1', date: '2025-12-10' },
    { id: 'int2', type: 'email', contact: 'c2', date: '2025-12-09' },
    { id: 'int3', type: 'meeting', contact: 'c3', date: '2025-12-08' },
    { id: 'int4', type: 'call', contact: 'c4', date: '2025-12-07' },
    { id: 'int5', type: 'message', contact: 'c5', date: '2025-12-06' },
  ];

  interactions.forEach((interaction, i) => {
    nodes.push({
      id: interaction.id,
      type: 'interaction',
      label: interaction.type,
      subLabel: interaction.date,
      interactionId: interaction.id,
      importance: 2 + i * 0.2,
      group: interaction.type,
    });

    links.push({
      id: `${interaction.id}-${interaction.contact}`,
      source: interaction.id,
      target: interaction.contact,
      type: 'contact_interaction',
    });
  });

  // FrameScans
  const frameScans = [
    { id: 'fs1', title: 'Sales Email to Sarah', contact: 'c1', score: 78, frame: 'apex' },
    { id: 'fs2', title: 'Partnership Proposal', contact: 'c3', score: 65, frame: 'mixed' },
    { id: 'fs3', title: 'Investor Pitch Deck', contact: 'c4', score: 82, frame: 'apex' },
    { id: 'fs4', title: 'LinkedIn Profile Review', contact: 'contact_zero', score: 71, frame: 'mixed' },
    { id: 'fs5', title: 'Cold Outreach Email', contact: 'c8', score: 58, frame: 'slave' },
  ];

  frameScans.forEach((scan, i) => {
    nodes.push({
      id: scan.id,
      type: 'framescan',
      label: scan.title,
      subLabel: `Score: ${scan.score}`,
      frameScanId: scan.id,
      importance: 8 + i * 0.5,
      group: scan.frame,
    });

    links.push({
      id: `${scan.id}-${scan.contact}`,
      source: scan.id,
      target: scan.contact,
      type: 'contact_framescan',
    });
  });

  // Link some scans to notes
  links.push(
    { id: 'fs1-n1', source: 'fs1', target: 'n1', type: 'note_framescan' },
    { id: 'fs2-n3', source: 'fs2', target: 'n3', type: 'note_framescan' }
  );

  return { nodes, links };
};
