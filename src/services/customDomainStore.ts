// =============================================================================
// CUSTOM DOMAIN STORE — User-defined domain classifications for FrameScan
// =============================================================================
// Allows users to create custom domain tags beyond the built-in ones.
// Examples: "Sales Emails", "Social Media DMs", "Meeting Notes", etc.
// Uses Zustand for reactive state management.
// =============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomDomain {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  color?: string; // Optional hex color for UI theming
}

interface CustomDomainState {
  domains: CustomDomain[];
  createDomain: (name: string, description?: string, color?: string) => CustomDomain;
  updateDomain: (id: string, updates: Partial<Omit<CustomDomain, 'id' | 'createdAt'>>) => void;
  deleteDomain: (id: string) => void;
  getDomainById: (id: string) => CustomDomain | undefined;
}

export const useCustomDomainStore = create<CustomDomainState>()(
  persist(
    (set, get) => ({
      domains: [],

      createDomain: (name: string, description?: string, color?: string) => {
        const newDomain: CustomDomain = {
          id: `custom_domain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name,
          description,
          color,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ domains: [...state.domains, newDomain] }));
        return newDomain;
      },

      updateDomain: (id: string, updates: Partial<Omit<CustomDomain, 'id' | 'createdAt'>>) => {
        set((state) => ({
          domains: state.domains.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        }));
      },

      deleteDomain: (id: string) => {
        set((state) => ({
          domains: state.domains.filter((d) => d.id !== id),
        }));
      },

      getDomainById: (id: string) => {
        return get().domains.find((d) => d.id === id);
      },
    }),
    {
      name: 'framelord-custom-domains',
    }
  )
);
