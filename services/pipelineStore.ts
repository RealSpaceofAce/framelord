// =============================================================================
// PIPELINE STORE — In-memory data source for Pipeline Templates and Items
// =============================================================================
// Pipelines represent workflows (e.g., Sales, Coaching) with stages.
// PipelineItems are contacts moving through stages.
// Stage automation can auto-create tasks when items enter stages.
// =============================================================================

import { PipelineTemplate, PipelineStageTemplate, PipelineItem } from '../types';
import { createTask } from './taskStore';
import { CONTACT_ZERO } from './contactStore';

// --- MOCK TEMPLATES ---

let PIPELINE_TEMPLATES: PipelineTemplate[] = [
  {
    id: 'template_sales',
    name: 'Sales Pipeline',
    description: 'Standard sales process from lead to close',
    domain: 'business',
    isDefault: true,
    stages: [
      {
        id: 'stage_lead',
        name: 'Lead',
        order: 0,
        color: '#94a3b8',
      },
      {
        id: 'stage_qualified',
        name: 'Qualified',
        order: 1,
        color: '#3b82f6',
        autoTaskTitle: 'Follow up lead',
        autoTaskDueInDays: 2,
      },
      {
        id: 'stage_proposal',
        name: 'Proposal',
        order: 2,
        color: '#8b5cf6',
        autoTaskTitle: 'Prepare proposal',
        autoTaskDueInDays: 3,
      },
      {
        id: 'stage_committed',
        name: 'Committed',
        order: 3,
        color: '#f59e0b',
        autoTaskTitle: 'Send contract',
        autoTaskDueInDays: 1,
      },
      {
        id: 'stage_won',
        name: 'Won',
        order: 4,
        color: '#10b981',
      },
      {
        id: 'stage_lost',
        name: 'Lost',
        order: 5,
        color: '#ef4444',
      },
    ],
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2025-12-01T00:00:00Z',
  },
  {
    id: 'template_coaching',
    name: 'Coaching Client Journey',
    description: 'Client onboarding and engagement pipeline',
    domain: 'hybrid',
    isDefault: false,
    stages: [
      {
        id: 'stage_prospect',
        name: 'Prospect',
        order: 0,
        color: '#94a3b8',
      },
      {
        id: 'stage_strategy_call',
        name: 'Strategy Call',
        order: 1,
        color: '#3b82f6',
        autoTaskTitle: 'Schedule strategy call',
        autoTaskDueInDays: 1,
      },
      {
        id: 'stage_enrolled',
        name: 'Enrolled',
        order: 2,
        color: '#8b5cf6',
        autoTaskTitle: 'Send welcome package',
        autoTaskDueInDays: 2,
      },
      {
        id: 'stage_onboarding',
        name: 'Onboarding',
        order: 3,
        color: '#f59e0b',
        autoTaskTitle: 'Complete onboarding checklist',
        autoTaskDueInDays: 3,
      },
      {
        id: 'stage_active',
        name: 'Active',
        order: 4,
        color: '#10b981',
      },
      {
        id: 'stage_complete',
        name: 'Complete',
        order: 5,
        color: '#6b7280',
      },
    ],
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2025-12-01T00:00:00Z',
  },
];

// --- MOCK ITEMS ---

let PIPELINE_ITEMS: PipelineItem[] = [
  {
    id: 'item_001',
    templateId: 'template_sales',
    contactId: 'c_sarah_chen',
    label: 'Enterprise Deal',
    currentStageId: 'stage_qualified',
    createdAt: '2025-11-28T10:00:00Z',
    updatedAt: '2025-12-01T14:00:00Z',
    status: 'open',
    value: 50000,
  },
  {
    id: 'item_002',
    templateId: 'template_sales',
    contactId: 'c_marcus_johnson',
    label: 'Q4 Renewal',
    currentStageId: 'stage_committed',
    createdAt: '2025-11-15T09:00:00Z',
    updatedAt: '2025-12-01T16:00:00Z',
    status: 'open',
    value: 25000,
  },
  {
    id: 'item_003',
    templateId: 'template_coaching',
    contactId: 'c_elena_rodriguez',
    label: 'Leadership Coaching',
    currentStageId: 'stage_active',
    createdAt: '2025-10-01T08:00:00Z',
    updatedAt: '2025-11-15T10:00:00Z',
    status: 'open',
  },
];

// --- HELPER FUNCTIONS ---

/**
 * Apply stage automation: create task if stage has autoTaskTitle
 */
function applyStageAutomation(item: PipelineItem, stage: PipelineStageTemplate): void {
  if (!stage.autoTaskTitle) return;

  // Compute due date
  let dueAt: string | null = null;
  if (stage.autoTaskDueInDays !== undefined) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + stage.autoTaskDueInDays);
    dueAt = dueDate.toISOString();
  } else {
    // Today with no time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueAt = today.toISOString();
  }

  // Create task
  createTask({
    contactId: item.contactId,
    title: stage.autoTaskTitle,
    dueAt,
  });
}

/**
 * Detect if a stage name indicates a terminal state (won/lost)
 */
function isTerminalStage(stageName: string): 'won' | 'lost' | null {
  const lower = stageName.toLowerCase();
  if (lower.includes('won')) return 'won';
  if (lower.includes('lost')) return 'lost';
  return null;
}

// --- TEMPLATE FUNCTIONS ---

/** Get all pipeline templates */
export const getPipelineTemplates = (): PipelineTemplate[] => {
  return [...PIPELINE_TEMPLATES];
};

/** Get a template by ID */
export const getPipelineTemplateById = (id: string): PipelineTemplate | undefined => {
  return PIPELINE_TEMPLATES.find(t => t.id === id);
};

/** Get the default template */
export const getDefaultPipelineTemplate = (): PipelineTemplate | undefined => {
  return PIPELINE_TEMPLATES.find(t => t.isDefault) || PIPELINE_TEMPLATES[0];
};

/** Create a new pipeline template */
export const createPipelineTemplate = (input: {
  name: string;
  description?: string;
  domain: 'business' | 'personal' | 'hybrid';
  stages: Omit<PipelineStageTemplate, 'id' | 'order'>[];
}): PipelineTemplate => {
  const now = new Date().toISOString();
  
  const stages: PipelineStageTemplate[] = input.stages.map((stage, index) => ({
    ...stage,
    id: `stage_${Date.now()}_${index}`,
    order: index,
  }));

  const template: PipelineTemplate = {
    id: `pipeline-${Date.now()}`,
    name: input.name.trim(),
    description: input.description?.trim(),
    domain: input.domain,
    stages,
    createdAt: now,
    updatedAt: now,
  };

  PIPELINE_TEMPLATES.push(template);
  return template;
};

/** Update an existing pipeline template */
export const updatePipelineTemplate = (template: PipelineTemplate): void => {
  const index = PIPELINE_TEMPLATES.findIndex(t => t.id === template.id);
  if (index === -1) {
    console.warn(`Pipeline template with id ${template.id} not found`);
    return;
  }

  const updated: PipelineTemplate = {
    ...template,
    updatedAt: new Date().toISOString(),
  };

  PIPELINE_TEMPLATES[index] = updated;
};

/** Delete a pipeline template (hard delete) */
export const deletePipelineTemplate = (id: string): void => {
  const items = getPipelineItemsByTemplate(id);
  if (items.length > 0) {
    throw new Error('Cannot delete template: it has active items');
  }

  const index = PIPELINE_TEMPLATES.findIndex(t => t.id === id);
  if (index === -1) {
    console.warn(`Pipeline template with id ${id} not found`);
    return;
  }

  PIPELINE_TEMPLATES.splice(index, 1);
};

// --- ITEM FUNCTIONS ---

/** Get all pipeline items for a template */
export const getPipelineItemsByTemplate = (templateId: string): PipelineItem[] => {
  return PIPELINE_ITEMS
    .filter(item => item.templateId === templateId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

/** Get all pipeline items for a contact */
export const getPipelineItemsByContact = (contactId: string): PipelineItem[] => {
  return PIPELINE_ITEMS
    .filter(item => item.contactId === contactId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

/** Get a pipeline item by ID */
export const getPipelineItemById = (id: string): PipelineItem | undefined => {
  return PIPELINE_ITEMS.find(item => item.id === id);
};

/** Create a new pipeline item */
export const createPipelineItem = (input: {
  templateId: string;
  contactId: string;
  label?: string;
  initialStageId?: string;
}): PipelineItem => {
  const template = getPipelineTemplateById(input.templateId);
  if (!template) {
    throw new Error(`Pipeline template with id ${input.templateId} not found`);
  }

  // Determine initial stage
  let initialStageId = input.initialStageId;
  if (!initialStageId) {
    // Default to first stage
    const firstStage = template.stages.sort((a, b) => a.order - b.order)[0];
    if (!firstStage) {
      throw new Error(`Template ${input.templateId} has no stages`);
    }
    initialStageId = firstStage.id;
  }

  const now = new Date().toISOString();
  const item: PipelineItem = {
    id: `item-${Date.now()}`,
    templateId: input.templateId,
    contactId: input.contactId,
    label: input.label?.trim(),
    currentStageId: initialStageId,
    createdAt: now,
    updatedAt: now,
    status: 'open',
  };

  PIPELINE_ITEMS.push(item);

  // Apply stage automation
  const stage = template.stages.find(s => s.id === initialStageId);
  if (stage) {
    applyStageAutomation(item, stage);
  }

  return item;
};

/** Move a pipeline item to a new stage */
export const movePipelineItem = (itemId: string, newStageId: string): PipelineItem | undefined => {
  const item = getPipelineItemById(itemId);
  if (!item) {
    console.warn(`Pipeline item with id ${itemId} not found`);
    return undefined;
  }

  const template = getPipelineTemplateById(item.templateId);
  if (!template) {
    console.warn(`Template for item ${itemId} not found`);
    return undefined;
  }

  const newStage = template.stages.find(s => s.id === newStageId);
  if (!newStage) {
    console.warn(`Stage ${newStageId} not found in template`);
    return undefined;
  }

  // Update item
  const updated: PipelineItem = {
    ...item,
    currentStageId: newStageId,
    updatedAt: new Date().toISOString(),
  };

  // Check if moved to terminal stage
  const terminalStatus = isTerminalStage(newStage.name);
  if (terminalStatus) {
    updated.status = terminalStatus;
    updated.closedAt = new Date().toISOString();
  }

  const index = PIPELINE_ITEMS.findIndex(i => i.id === itemId);
  if (index !== -1) {
    PIPELINE_ITEMS[index] = updated;
  }

  // Apply stage automation
  applyStageAutomation(updated, newStage);

  return updated;
};

/** Update a pipeline item */
export const updatePipelineItem = (item: PipelineItem): void => {
  const index = PIPELINE_ITEMS.findIndex(i => i.id === item.id);
  if (index === -1) {
    console.warn(`Pipeline item with id ${item.id} not found`);
    return;
  }

  const updated: PipelineItem = {
    ...item,
    updatedAt: new Date().toISOString(),
  };

  PIPELINE_ITEMS[index] = updated;
};

/** Archive a pipeline item */
export const archivePipelineItem = (itemId: string): void => {
  const item = getPipelineItemById(itemId);
  if (!item) {
    console.warn(`Pipeline item with id ${itemId} not found`);
    return;
  }

  const updated: PipelineItem = {
    ...item,
    status: 'archived',
    updatedAt: new Date().toISOString(),
  };

  const index = PIPELINE_ITEMS.findIndex(i => i.id === itemId);
  if (index !== -1) {
    PIPELINE_ITEMS[index] = updated;
  }
};







