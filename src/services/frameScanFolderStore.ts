// =============================================================================
// FRAMESCAN FOLDER STORE — Organization system for FrameScan reports
// =============================================================================
// Allows users to organize FrameScan reports into folders for better management.
// Uses Zustand for reactive state management with subscribe support.
// =============================================================================

import { create } from 'zustand';

export interface FrameScanFolder {
  id: string;
  name: string;
  createdAt: string;
  reportIds: string[];
}

interface FrameScanFolderState {
  folders: FrameScanFolder[];
  selectedFolderId: string | null;
  createFolder: (name: string) => FrameScanFolder;
  addReportToFolder: (folderId: string, reportId: string) => void;
  removeReportFromFolder: (folderId: string, reportId: string) => void;
  deleteFolder: (folderId: string) => void;
  selectFolder: (folderId: string | null) => void;
  renameFolder: (folderId: string, newName: string) => void;
}

export const useFrameScanFolderStore = create<FrameScanFolderState>((set, get) => ({
  folders: [],
  selectedFolderId: null,

  createFolder: (name: string) => {
    const newFolder: FrameScanFolder = {
      id: `folder_${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      reportIds: [],
    };
    set((state) => ({ folders: [...state.folders, newFolder] }));
    return newFolder;
  },

  addReportToFolder: (folderId: string, reportId: string) => {
    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === folderId && !f.reportIds.includes(reportId)
          ? { ...f, reportIds: [...f.reportIds, reportId] }
          : f
      ),
    }));
  },

  removeReportFromFolder: (folderId: string, reportId: string) => {
    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === folderId
          ? { ...f, reportIds: f.reportIds.filter((id) => id !== reportId) }
          : f
      ),
    }));
  },

  deleteFolder: (folderId: string) => {
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== folderId),
      selectedFolderId: state.selectedFolderId === folderId ? null : state.selectedFolderId,
    }));
  },

  selectFolder: (folderId: string | null) => {
    set({ selectedFolderId: folderId });
  },

  renameFolder: (folderId: string, newName: string) => {
    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === folderId ? { ...f, name: newName } : f
      ),
    }));
  },
}));
