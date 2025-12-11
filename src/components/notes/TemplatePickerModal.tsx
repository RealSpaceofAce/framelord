// =============================================================================
// TEMPLATE PICKER MODAL — Select template for new notes
// =============================================================================
// Features:
// - Predefined note templates
// - Template categories
// - Preview template structure
// - Quick create from template
// =============================================================================

import React, { useState } from 'react';
import { FileText, CheckCircle2, X, Calendar, ListChecks, Sparkles, BookOpen, Target, Scan, Mail, Users, BookMarked, Plus, Edit2, Trash2 } from 'lucide-react';
import { noteTemplates as frameLordTemplates } from '../../services/noteTemplates';
import { useUserTemplatesStore, replaceUserTemplateVariables } from '../../services/userTemplatesStore';

// =============================================================================
// TYPES
// =============================================================================

export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  icon?: React.ReactNode;
  category?: 'productivity' | 'personal' | 'creative' | 'business';
  content?: string;
  body?: string;  // Support both content and body fields
}

export interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: NoteTemplate) => void;
  theme: 'light' | 'dark';
  colors: Record<string, string>;
}

// =============================================================================
// TEMPLATES
// =============================================================================

// Map FrameLord templates to include icons and categories
const TEMPLATES: NoteTemplate[] = frameLordTemplates.map(template => {
  let icon: React.ReactNode = <FileText size={24} />;
  let category: 'productivity' | 'personal' | 'creative' | 'business' = 'productivity';

  // Assign icons and categories based on template ID
  switch (template.id) {
    case 'framescan-summary':
      icon = <Scan size={24} />;
      category = 'business';
      break;
    case 'sales-outreach':
      icon = <Mail size={24} />;
      category = 'business';
      break;
    case 'meeting-prep':
      icon = <Users size={24} />;
      category = 'business';
      break;
    case 'daily-log':
      icon = <BookMarked size={24} />;
      category = 'personal';
      break;
  }

  return {
    ...template,
    icon,
    category,
    content: template.body,  // Map body to content for compatibility
  };
});

// Add a blank template at the beginning
TEMPLATES.unshift({
  id: 'blank',
  name: 'Blank Note',
  description: 'Start with an empty note',
  icon: <FileText size={24} />,
  category: 'productivity',
  content: '',
});

const CATEGORIES = [
  { id: 'all' as const, name: 'All Templates' },
  { id: 'productivity' as const, name: 'Productivity' },
  { id: 'business' as const, name: 'Business' },
  { id: 'personal' as const, name: 'Personal' },
  { id: 'creative' as const, name: 'Creative' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  theme,
  colors,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'productivity' | 'personal' | 'creative' | 'business'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'built-in' | 'my-templates'>('built-in');
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    content: '',
    category: 'productivity' as const,
  });

  const { templates: userTemplates, addTemplate, updateTemplate, deleteTemplate } = useUserTemplatesStore();

  // Convert user templates to NoteTemplate format
  const userTemplatesFormatted: NoteTemplate[] = userTemplates.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    content: t.content,
    body: t.content,
    category: t.category,
    icon: <FileText size={24} />,
  }));

  // Filter templates by category
  const builtInTemplates = selectedCategory === 'all'
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === selectedCategory);

  const filteredUserTemplates = selectedCategory === 'all'
    ? userTemplatesFormatted
    : userTemplatesFormatted.filter(t => t.category === selectedCategory);

  // Handle template selection
  const handleSelectTemplate = (template: NoteTemplate) => {
    // Apply variable substitution for user templates
    if (template.id.startsWith('user-template-')) {
      const processedTemplate = {
        ...template,
        content: replaceUserTemplateVariables(template.content || ''),
        body: replaceUserTemplateVariables(template.body || ''),
      };
      onSelectTemplate(processedTemplate);
    } else {
      onSelectTemplate(template);
    }
    onClose();
  };

  // Reset form
  const resetForm = () => {
    setTemplateFormData({
      name: '',
      description: '',
      content: '',
      category: 'productivity',
    });
    setIsCreatingTemplate(false);
    setEditingTemplateId(null);
  };

  // Handle create template
  const handleCreateTemplate = () => {
    if (!templateFormData.name.trim() || !templateFormData.content.trim()) {
      return;
    }

    addTemplate({
      name: templateFormData.name.trim(),
      description: templateFormData.description.trim(),
      content: templateFormData.content.trim(),
      category: templateFormData.category,
    });

    resetForm();
  };

  // Handle edit template
  const handleEditTemplate = (templateId: string) => {
    const template = userTemplates.find(t => t.id === templateId);
    if (!template) return;

    setTemplateFormData({
      name: template.name,
      description: template.description,
      content: template.content,
      category: template.category || 'productivity',
    });
    setEditingTemplateId(templateId);
    setIsCreatingTemplate(true);
  };

  // Handle update template
  const handleUpdateTemplate = () => {
    if (!editingTemplateId || !templateFormData.name.trim() || !templateFormData.content.trim()) {
      return;
    }

    updateTemplate(editingTemplateId, {
      name: templateFormData.name.trim(),
      description: templateFormData.description.trim(),
      content: templateFormData.content.trim(),
      category: templateFormData.category,
    });

    resetForm();
  };

  // Handle delete template
  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(templateId);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div
          className="w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: colors.border }}>
            <div>
              <h3 className="font-semibold text-lg" style={{ color: colors.text }}>
                {isCreatingTemplate ? (editingTemplateId ? 'Edit Template' : 'Create Template') : 'Choose a Template'}
              </h3>
              <p className="text-sm mt-0.5" style={{ color: colors.textMuted }}>
                {isCreatingTemplate
                  ? 'Create your own custom template with {{date}} support'
                  : 'Start with a pre-built structure or create from scratch'}
              </p>
            </div>
            <button
              onClick={() => {
                if (isCreatingTemplate) {
                  resetForm();
                } else {
                  onClose();
                }
              }}
              className="p-2 rounded-lg hover:bg-white/10"
              style={{ color: colors.textMuted }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Tab Switcher - Only show when not creating template */}
          {!isCreatingTemplate && (
            <div className="px-6 py-3 border-b flex items-center gap-3" style={{ borderColor: colors.border }}>
              <button
                onClick={() => setActiveTab('built-in')}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: activeTab === 'built-in' ? colors.accent : 'transparent',
                  color: activeTab === 'built-in' ? '#fff' : colors.text,
                }}
              >
                Built-in Templates
              </button>
              <button
                onClick={() => setActiveTab('my-templates')}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: activeTab === 'my-templates' ? colors.accent : 'transparent',
                  color: activeTab === 'my-templates' ? '#fff' : colors.text,
                }}
              >
                My Templates ({userTemplates.length})
              </button>
              {activeTab === 'my-templates' && (
                <button
                  onClick={() => setIsCreatingTemplate(true)}
                  className="ml-auto px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors hover:opacity-80"
                  style={{ background: colors.accent, color: '#fff' }}
                >
                  <Plus size={16} />
                  New Template
                </button>
              )}
            </div>
          )}

          {/* Category Tabs - Only show when not creating template */}
          {!isCreatingTemplate && (
            <div className="px-6 py-3 border-b flex items-center gap-2 overflow-x-auto" style={{ borderColor: colors.border }}>
              {CATEGORIES.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                  style={{
                    background: selectedCategory === category.id ? colors.accent : colors.hover,
                    color: selectedCategory === category.id ? '#fff' : colors.text,
                  }}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}

          {/* Template Creation Form */}
          {isCreatingTemplate && (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="max-w-2xl mx-auto space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Template Name <span style={{ color: colors.accent }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={templateFormData.name}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                    placeholder="e.g., Weekly Review"
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
                    style={{
                      background: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Description
                  </label>
                  <input
                    type="text"
                    value={templateFormData.description}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                    placeholder="Brief description of this template"
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
                    style={{
                      background: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Category
                  </label>
                  <select
                    value={templateFormData.category}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
                    style={{
                      background: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  >
                    <option value="productivity">Productivity</option>
                    <option value="business">Business</option>
                    <option value="personal">Personal</option>
                    <option value="creative">Creative</option>
                  </select>
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Template Content <span style={{ color: colors.accent }}>*</span>
                  </label>
                  <textarea
                    value={templateFormData.content}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, content: e.target.value })}
                    placeholder="# Template Title&#10;&#10;Your content here...&#10;&#10;Use {{date}} for today's date"
                    rows={12}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 font-mono text-sm"
                    style={{
                      background: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                    Supports Markdown and <code style={{ background: colors.hover, padding: '2px 6px', borderRadius: '4px' }}>{'{{date}}'}</code> variable
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={editingTemplateId ? handleUpdateTemplate : handleCreateTemplate}
                    disabled={!templateFormData.name.trim() || !templateFormData.content.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: colors.accent, color: '#fff' }}
                  >
                    {editingTemplateId ? 'Update Template' : 'Create Template'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: colors.hover, color: colors.text }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Template Grid - Built-in Templates */}
          {!isCreatingTemplate && activeTab === 'built-in' && (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {builtInTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  onMouseEnter={() => setSelectedTemplate(template)}
                  className="p-4 rounded-xl text-left transition-all hover:shadow-lg group"
                  style={{
                    background: selectedTemplate?.id === template.id ? colors.active : colors.hover,
                    border: `1px solid ${selectedTemplate?.id === template.id ? colors.accent : 'transparent'}`,
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: colors.bg, color: colors.accent }}
                  >
                    {template.icon}
                  </div>

                  {/* Name */}
                  <h4 className="font-medium mb-1" style={{ color: colors.text }}>
                    {template.name}
                  </h4>

                  {/* Description */}
                  <p className="text-xs line-clamp-2" style={{ color: colors.textMuted }}>
                    {template.description}
                  </p>

                  {/* Selected Indicator */}
                  {selectedTemplate?.id === template.id && (
                    <div className="mt-3 flex items-center gap-1 text-xs" style={{ color: colors.accent }}>
                      <CheckCircle2 size={14} />
                      <span>Selected</span>
                    </div>
                  )}
                </button>
                ))}
              </div>
            </div>
          )}

          {/* Template Grid - User Templates */}
          {!isCreatingTemplate && activeTab === 'my-templates' && (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {filteredUserTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12" style={{ color: colors.textMuted }}>
                  <FileText size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No custom templates yet</p>
                  <p className="text-sm mb-4">Create your first template to get started</p>
                  <button
                    onClick={() => setIsCreatingTemplate(true)}
                    className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                    style={{ background: colors.accent, color: '#fff' }}
                  >
                    <Plus size={16} />
                    Create Template
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUserTemplates.map(template => (
                    <div
                      key={template.id}
                      className="p-4 rounded-xl relative group"
                      style={{
                        background: selectedTemplate?.id === template.id ? colors.active : colors.hover,
                        border: `1px solid ${selectedTemplate?.id === template.id ? colors.accent : 'transparent'}`,
                      }}
                      onMouseEnter={() => setSelectedTemplate(template)}
                    >
                      {/* Template Card Content */}
                      <button
                        onClick={() => handleSelectTemplate(template)}
                        className="w-full text-left"
                      >
                        {/* Icon */}
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center mb-3"
                          style={{ background: colors.bg, color: colors.accent }}
                        >
                          {template.icon}
                        </div>

                        {/* Name */}
                        <h4 className="font-medium mb-1" style={{ color: colors.text }}>
                          {template.name}
                        </h4>

                        {/* Description */}
                        <p className="text-xs line-clamp-2" style={{ color: colors.textMuted }}>
                          {template.description || 'Custom template'}
                        </p>

                        {/* Selected Indicator */}
                        {selectedTemplate?.id === template.id && (
                          <div className="mt-3 flex items-center gap-1 text-xs" style={{ color: colors.accent }}>
                            <CheckCircle2 size={14} />
                            <span>Selected</span>
                          </div>
                        )}
                      </button>

                      {/* Action Buttons - Show on hover */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTemplate(template.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/20"
                          style={{ color: colors.text }}
                          title="Edit template"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-500/20"
                          style={{ color: '#ef4444' }}
                          title="Delete template"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          {!isCreatingTemplate && (
            <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: colors.border }}>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                {activeTab === 'built-in'
                  ? `${builtInTemplates.length} template${builtInTemplates.length !== 1 ? 's' : ''} available`
                  : `${filteredUserTemplates.length} custom template${filteredUserTemplates.length !== 1 ? 's' : ''}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: colors.hover, color: colors.text }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSelectTemplate(TEMPLATES[0])}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: colors.accent, color: '#fff' }}
                >
                  Create Blank Note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TemplatePickerModal;
