// =============================================================================
// USER TEMPLATES STORE — Custom note templates with localStorage persistence
// =============================================================================
// Allows users to create, edit, and delete their own note templates.
// Templates support {{date}} variable substitution like built-in templates.
// =============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =============================================================================
// TYPES
// =============================================================================

export interface UserTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category?: 'productivity' | 'personal' | 'creative' | 'business';
  createdAt: string;
  updatedAt: string;
}

interface UserTemplatesState {
  templates: UserTemplate[];
  addTemplate: (template: Omit<UserTemplate, 'id' | 'createdAt' | 'updatedAt'>) => UserTemplate;
  updateTemplate: (id: string, updates: Partial<Omit<UserTemplate, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteTemplate: (id: string) => void;
  getTemplateById: (id: string) => UserTemplate | undefined;
}

// =============================================================================
// STORE
// =============================================================================

export const useUserTemplatesStore = create<UserTemplatesState>()(
  persist(
    (set, get) => ({
      templates: [],

      addTemplate: (template) => {
        const now = new Date().toISOString();
        const newTemplate: UserTemplate = {
          ...template,
          id: `user-template-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          templates: [...state.templates, newTemplate],
        }));

        return newTemplate;
      },

      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          ),
        }));
      },

      deleteTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        }));
      },

      getTemplateById: (id) => {
        return get().templates.find((t) => t.id === id);
      },
    }),
    {
      name: 'framelord-user-templates',
    }
  )
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Replace template variables like {{date}} with actual values.
 * Same behavior as built-in templates.
 */
export function replaceUserTemplateVariables(templateContent: string): string {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

  return templateContent.replace(/\{\{date\}\}/g, dateString);
}
