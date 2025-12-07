// =============================================================================
// PIPELINES VIEW — Pipeline Board and Template Management
// =============================================================================
// Board tab: Kanban-style view of contacts moving through pipeline stages.
// Templates tab: Create and edit pipeline templates with stages and automation.
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  PipelineTemplate,
  PipelineItem,
  PipelineStageTemplate,
  RelationshipDomain,
} from '../../types';
import {
  getPipelineTemplates,
  getPipelineTemplateById,
  getDefaultPipelineTemplate,
  createPipelineTemplate,
  updatePipelineTemplate,
  deletePipelineTemplate,
  getPipelineItemsByTemplate,
  createPipelineItem,
  movePipelineItem,
} from '../../services/pipelineStore';
import { getAllContacts } from '../../services/contactStore';
import { getContactById } from '../../services/contactStore';
import {
  Layout,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  ChevronUp,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';

// --- PROPS ---

interface PipelinesViewProps {
  selectedContactId: string;
  setSelectedContactId: (id: string) => void;
  onNavigateToDossier: () => void;
}

type Tab = 'board' | 'templates';

// --- COMPONENT ---

export const PipelinesView: React.FC<PipelinesViewProps> = ({
  selectedContactId,
  setSelectedContactId,
  onNavigateToDossier,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('board');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(() => {
    const defaultTemplate = getDefaultPipelineTemplate();
    return defaultTemplate?.id || null;
  });
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Drag and drop state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Templates tab state
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<{
    name: string;
    description: string;
    domain: RelationshipDomain;
    stages: (Omit<PipelineStageTemplate, 'id' | 'order'> & { tempId: string })[];
  } | null>(null);

  const templates = getPipelineTemplates();
  const selectedTemplate = selectedTemplateId
    ? getPipelineTemplateById(selectedTemplateId)
    : null;

  // --- BOARD TAB ---

  const boardItems = useMemo(() => {
    if (!selectedTemplateId) return [];
    return getPipelineItemsByTemplate(selectedTemplateId);
  }, [selectedTemplateId, refreshKey]);

  const [newItemContactId, setNewItemContactId] = useState<string>('');
  const [newItemLabel, setNewItemLabel] = useState<string>('');

  const handleAddToPipeline = () => {
    if (!selectedTemplateId || !newItemContactId) return;

    createPipelineItem({
      templateId: selectedTemplateId,
      contactId: newItemContactId,
      label: newItemLabel.trim() || undefined,
    });

    setNewItemContactId('');
    setNewItemLabel('');
    setRefreshKey(k => k + 1);
  };

  const handleMoveItem = (itemId: string, newStageId: string) => {
    movePipelineItem(itemId, newStageId);
    setRefreshKey(k => k + 1);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItemId(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItemId(null);
    setDragOverStageId(null);
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStageId(stageId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the stage column (not entering a child)
    const target = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!target.contains(relatedTarget)) {
      setDragOverStageId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStageId(null);

    const itemId = e.dataTransfer.getData('text/plain') || draggedItemId;
    if (!itemId) return;

    const item = boardItems.find(i => i.id === itemId);
    if (!item || item.currentStageId === targetStageId) {
      setDraggedItemId(null);
      return;
    }

    handleMoveItem(itemId, targetStageId);
    setDraggedItemId(null);
  };

  const handleContactClick = (contactId: string) => {
    setSelectedContactId(contactId);
    onNavigateToDossier();
  };

  // --- TEMPLATES TAB ---

  const handleStartEditTemplate = (template: PipelineTemplate) => {
    setEditingTemplateId(template.id);
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      domain: template.domain,
      stages: template.stages.map((stage, index) => ({
        name: stage.name,
        color: stage.color || '',
        autoTaskTitle: stage.autoTaskTitle || '',
        autoTaskDueInDays: stage.autoTaskDueInDays,
        tempId: `temp_${index}`,
      })),
    });
  };

  const handleStartNewTemplate = () => {
    setEditingTemplateId('new');
    setTemplateForm({
      name: '',
      description: '',
      domain: 'business',
      stages: [
        { name: 'Stage 1', color: '', autoTaskTitle: '', tempId: 'temp_0' },
      ],
    });
  };

  const handleCancelEdit = () => {
    setEditingTemplateId(null);
    setTemplateForm(null);
  };

  const handleSaveTemplate = () => {
    if (!templateForm) return;

    if (editingTemplateId === 'new') {
      // Create new template
      const newTemplate = createPipelineTemplate({
        name: templateForm.name,
        description: templateForm.description || undefined,
        domain: templateForm.domain,
        stages: templateForm.stages.map(stage => ({
          name: stage.name,
          color: stage.color || undefined,
          autoTaskTitle: stage.autoTaskTitle || undefined,
          autoTaskDueInDays: stage.autoTaskDueInDays,
        })),
      });
      setSelectedTemplateId(newTemplate.id);
    } else if (editingTemplateId) {
      // Update existing template
      const existing = getPipelineTemplateById(editingTemplateId);
      if (!existing) return;

      const updated: PipelineTemplate = {
        ...existing,
        name: templateForm.name,
        description: templateForm.description || undefined,
        domain: templateForm.domain,
        stages: templateForm.stages.map((stage, index) => ({
          id: existing.stages[index]?.id || `stage_${Date.now()}_${index}`,
          name: stage.name,
          order: index,
          color: stage.color || undefined,
          autoTaskTitle: stage.autoTaskTitle || undefined,
          autoTaskDueInDays: stage.autoTaskDueInDays,
        })),
        updatedAt: new Date().toISOString(),
      };
      updatePipelineTemplate(updated);
    }

    setEditingTemplateId(null);
    setTemplateForm(null);
    setRefreshKey(k => k + 1);
  };

  const handleDeleteTemplate = (id: string) => {
    try {
      deletePipelineTemplate(id);
      if (selectedTemplateId === id) {
        const remaining = getPipelineTemplates().filter(t => t.id !== id);
        setSelectedTemplateId(remaining[0]?.id || null);
      }
      setRefreshKey(k => k + 1);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Cannot delete template with active items');
    }
  };

  const handleAddStage = () => {
    if (!templateForm) return;
    setTemplateForm({
      ...templateForm,
      stages: [
        ...templateForm.stages,
        {
          name: `Stage ${templateForm.stages.length + 1}`,
          color: '',
          autoTaskTitle: '',
          tempId: `temp_${Date.now()}`,
        },
      ],
    });
  };

  const handleRemoveStage = (tempId: string) => {
    if (!templateForm || templateForm.stages.length <= 1) return;
    setTemplateForm({
      ...templateForm,
      stages: templateForm.stages.filter(s => s.tempId !== tempId),
    });
  };

  const handleMoveStage = (tempId: string, direction: 'up' | 'down') => {
    if (!templateForm) return;
    const index = templateForm.stages.findIndex(s => s.tempId === tempId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= templateForm.stages.length) return;

    const newStages = [...templateForm.stages];
    [newStages[index], newStages[newIndex]] = [newStages[newIndex], newStages[index]];

    setTemplateForm({ ...templateForm, stages: newStages });
  };

  // --- RENDER ---

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layout size={20} className="text-[#4433FF]" />
          <h1 className="text-2xl font-display font-bold text-white">Pipelines</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#2A2A2A]">
        <button
          onClick={() => setActiveTab('board')}
          className={`px-4 py-2 text-sm font-bold transition-colors ${
            activeTab === 'board'
              ? 'text-[#4433FF] border-b-2 border-[#4433FF]'
              : 'text-gray-500 hover:text-white'
          }`}
        >
          Board
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 text-sm font-bold transition-colors ${
            activeTab === 'templates'
              ? 'text-[#4433FF] border-b-2 border-[#4433FF]'
              : 'text-gray-500 hover:text-white'
          }`}
        >
          Templates
        </button>
      </div>

      {/* Board Tab */}
      {activeTab === 'board' && (
        <div className="space-y-6">
          {/* Template Selection */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-4">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">
              Active Pipeline Template
            </label>
            <select
              value={selectedTemplateId || ''}
              onChange={(e) => setSelectedTemplateId(e.target.value || null)}
              className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {selectedTemplate ? (
            <>
              {/* Add to Pipeline */}
              <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-3">+ Add to Pipeline</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={newItemContactId}
                    onChange={(e) => setNewItemContactId(e.target.value)}
                    className="bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
                  >
                    <option value="">Select contact...</option>
                    {getAllContacts(false).map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {contact.fullName}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    placeholder="Deal/Case name (optional)"
                    className="bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
                  />
                  <button
                    onClick={handleAddToPipeline}
                    disabled={!newItemContactId}
                    className="px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] disabled:bg-[#333] disabled:cursor-not-allowed text-white text-xs font-bold rounded transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>

              {/* Kanban Board */}
              <div className="overflow-x-auto">
                <div className="flex gap-4 min-w-max pb-4">
                  {selectedTemplate.stages
                    .sort((a, b) => a.order - b.order)
                    .map((stage) => {
                      const stageItems = boardItems.filter(
                        item => item.currentStageId === stage.id && item.status === 'open'
                      );

                      return (
                        <div
                          key={stage.id}
                          className={`flex-shrink-0 w-64 bg-[#0E0E0E] border rounded-xl p-4 transition-colors ${
                            dragOverStageId === stage.id
                              ? 'border-[#4433FF] bg-[#4433FF]/10'
                              : 'border-[#2A2A2A]'
                          }`}
                          onDragOver={(e) => handleDragOver(e, stage.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, stage.id)}
                        >
                          {/* Stage Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              {stage.color && (
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: stage.color }}
                                />
                              )}
                              <h3 className="text-sm font-bold text-white">{stage.name}</h3>
                            </div>
                            <span className="text-xs text-gray-500 bg-[#1A1A1D] px-2 py-1 rounded">
                              {stageItems.length}
                            </span>
                          </div>

                          {/* Stage Cards */}
                          <div className="space-y-2 max-h-[500px] overflow-y-auto min-h-[100px]">
                            {stageItems.length === 0 && draggedItemId && (
                              <div className="text-center py-8 text-gray-600 text-xs border-2 border-dashed border-[#4433FF]/30 rounded-lg">
                                Drop here
                              </div>
                            )}
                            {stageItems.map((item) => {
                              const contact = getContactById(item.contactId);
                              if (!contact) return null;

                              return (
                                <div
                                  key={item.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, item.id)}
                                  onDragEnd={handleDragEnd}
                                  className={`bg-[#1A1A1D] border rounded-lg p-3 cursor-move transition-all ${
                                    draggedItemId === item.id
                                      ? 'opacity-50 border-[#4433FF]'
                                      : 'border-[#333] hover:border-[#4433FF]'
                                  }`}
                                >
                                  {/* Contact */}
                                  <button
                                    onClick={() => handleContactClick(contact.id)}
                                    className="flex items-center gap-2 mb-2 w-full text-left"
                                    onMouseDown={(e) => {
                                      // Prevent drag when clicking the button
                                      e.stopPropagation();
                                    }}
                                  >
                                    <img
                                      src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                                      alt={contact.fullName}
                                      className="w-8 h-8 rounded-full border border-[#333]"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-bold text-white truncate">
                                        {contact.fullName}
                                      </div>
                                      {item.label && (
                                        <div className="text-xs text-gray-400 truncate">
                                          {item.label}
                                        </div>
                                      )}
                                    </div>
                                    <ArrowRight size={12} className="text-gray-500 flex-shrink-0" />
                                  </button>

                                  {/* Status Badge */}
                                  <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                                      item.status === 'won'
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : item.status === 'lost'
                                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    }`}>
                                      {item.status}
                                    </span>
                                    <span className="text-[10px] text-gray-600">
                                      {new Date(item.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>

                                  {/* Stage Move Control (fallback) */}
                                  <select
                                    value={item.currentStageId}
                                    onChange={(e) => handleMoveItem(item.id, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="w-full bg-[#0E0E0E] border border-[#333] rounded px-2 py-1 text-xs text-white focus:border-[#4433FF] outline-none"
                                    title="Or drag the card to move"
                                  >
                                    {selectedTemplate.stages
                                      .sort((a, b) => a.order - b.order)
                                      .map(s => (
                                        <option key={s.id} value={s.id}>
                                          {s.name}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No pipeline template selected
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Template List */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Templates</h3>
              <button
                onClick={handleStartNewTemplate}
                className="px-3 py-1.5 bg-[#4433FF] hover:bg-[#5544FF] text-white text-xs font-bold rounded transition-colors flex items-center gap-2"
              >
                <Plus size={14} /> New
              </button>
            </div>
            <div className="space-y-2">
              {templates.map(template => {
                const itemCount = getPipelineItemsByTemplate(template.id).length;
                return (
                  <div
                    key={template.id}
                    className={`p-3 bg-[#1A1A1D] border rounded-lg ${
                      editingTemplateId === template.id
                        ? 'border-[#4433FF]'
                        : 'border-[#333] hover:border-[#4433FF]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <div className="text-sm font-bold text-white">{template.name}</div>
                        <div className="text-xs text-gray-500">{template.domain}</div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleStartEditTemplate(template)}
                          className="p-1 text-gray-400 hover:text-[#4433FF] transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          disabled={itemCount > 0}
                          className="p-1 text-gray-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title={itemCount > 0 ? 'Cannot delete: has active items' : 'Delete'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      {template.stages.length} stages • {itemCount} items
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Template Editor */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            {templateForm ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    {editingTemplateId === 'new' ? 'New Template' : 'Edit Template'}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 bg-[#1A1A1D] border border-[#333] hover:border-red-500 text-white text-xs font-bold rounded transition-colors flex items-center gap-2"
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button
                      onClick={handleSaveTemplate}
                      className="px-3 py-1.5 bg-[#4433FF] hover:bg-[#5544FF] text-white text-xs font-bold rounded transition-colors flex items-center gap-2"
                    >
                      <Save size={14} /> Save
                    </button>
                  </div>
                </div>

                {/* Template Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                      Name
                    </label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
                      placeholder="Sales Pipeline"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                      Description
                    </label>
                    <textarea
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                      className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none resize-none"
                      rows={2}
                      placeholder="Optional description"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                      Domain
                    </label>
                    <select
                      value={templateForm.domain}
                      onChange={(e) => setTemplateForm({ ...templateForm, domain: e.target.value as RelationshipDomain })}
                      className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
                    >
                      <option value="business">Business</option>
                      <option value="personal">Personal</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                {/* Stages */}
                <div className="border-t border-[#2A2A2A] pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Stages
                    </label>
                    <button
                      onClick={handleAddStage}
                      className="px-2 py-1 bg-[#1A1A1D] border border-[#333] hover:border-[#4433FF] text-white text-xs font-bold rounded transition-colors flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Stage
                    </button>
                  </div>
                  <div className="space-y-2">
                    {templateForm.stages.map((stage, index) => (
                      <div
                        key={stage.tempId}
                        className="p-3 bg-[#1A1A1D] border border-[#333] rounded-lg space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleMoveStage(stage.tempId, 'up')}
                              disabled={index === 0}
                              className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              onClick={() => handleMoveStage(stage.tempId, 'down')}
                              disabled={index === templateForm.stages.length - 1}
                              className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ChevronDown size={12} />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={stage.name}
                            onChange={(e) => {
                              const newStages = [...templateForm.stages];
                              newStages[index].name = e.target.value;
                              setTemplateForm({ ...templateForm, stages: newStages });
                            }}
                            className="flex-1 bg-[#0E0E0E] border border-[#333] rounded px-2 py-1 text-white text-xs focus:border-[#4433FF] outline-none"
                            placeholder="Stage name"
                          />
                          <input
                            type="text"
                            value={stage.color}
                            onChange={(e) => {
                              const newStages = [...templateForm.stages];
                              newStages[index].color = e.target.value;
                              setTemplateForm({ ...templateForm, stages: newStages });
                            }}
                            className="w-20 bg-[#0E0E0E] border border-[#333] rounded px-2 py-1 text-white text-xs focus:border-[#4433FF] outline-none"
                            placeholder="#color"
                          />
                          <button
                            onClick={() => handleRemoveStage(stage.tempId)}
                            disabled={templateForm.stages.length <= 1}
                            className="p-1 text-gray-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={stage.autoTaskTitle}
                            onChange={(e) => {
                              const newStages = [...templateForm.stages];
                              newStages[index].autoTaskTitle = e.target.value;
                              setTemplateForm({ ...templateForm, stages: newStages });
                            }}
                            className="bg-[#0E0E0E] border border-[#333] rounded px-2 py-1 text-white text-xs focus:border-[#4433FF] outline-none"
                            placeholder="Auto task title"
                          />
                          <input
                            type="number"
                            value={stage.autoTaskDueInDays ?? ''}
                            onChange={(e) => {
                              const newStages = [...templateForm.stages];
                              newStages[index].autoTaskDueInDays = e.target.value
                                ? parseInt(e.target.value, 10)
                                : undefined;
                              setTemplateForm({ ...templateForm, stages: newStages });
                            }}
                            className="bg-[#0E0E0E] border border-[#333] rounded px-2 py-1 text-white text-xs focus:border-[#4433FF] outline-none"
                            placeholder="Due in days"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 text-sm">
                Select a template to edit or create a new one
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
