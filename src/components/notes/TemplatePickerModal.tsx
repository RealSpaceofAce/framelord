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
import { FileText, CheckCircle2, X, Calendar, ListChecks, Sparkles, BookOpen, Target, Scan, Mail, Users, BookMarked } from 'lucide-react';
import { noteTemplates as frameLordTemplates } from '../../services/noteTemplates';

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

  // Filter templates by category
  const filteredTemplates = selectedCategory === 'all'
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === selectedCategory);

  // Handle template selection
  const handleSelectTemplate = (template: NoteTemplate) => {
    onSelectTemplate(template);
    onClose();
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
                Choose a Template
              </h3>
              <p className="text-sm mt-0.5" style={{ color: colors.textMuted }}>
                Start with a pre-built structure or create from scratch
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10"
              style={{ color: colors.textMuted }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Category Tabs */}
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

          {/* Template Grid */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(template => (
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

          {/* Footer */}
          <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: colors.border }}>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
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
        </div>
      </div>
    </>
  );
};

export default TemplatePickerModal;
