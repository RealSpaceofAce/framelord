// =============================================================================
// FOLDER MOVE DIALOG — Move notes between folders
// =============================================================================
// Features:
// - Shows folder hierarchy with indentation
// - Select destination folder
// - Handles nested folders
// - Keyboard navigation
// =============================================================================

import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, X, Check, ChevronRight } from 'lucide-react';
import type { Note } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  noteIds: string[];
  isExpanded?: boolean;
}

export interface FolderMoveDialogProps {
  isOpen: boolean;
  note: Note | null;
  folders: FolderItem[];
  onClose: () => void;
  onMove: (noteId: string, folderId: string) => void;
  theme: 'light' | 'dark';
  colors: Record<string, string>;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const FolderMoveDialog: React.FC<FolderMoveDialogProps> = ({
  isOpen,
  note,
  folders,
  onClose,
  onMove,
  theme,
  colors,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());

  // Get current folder
  const currentFolderId = folders.find(f => note && f.noteIds.includes(note.id))?.id || null;

  // Initialize expanded folders to show current location
  useEffect(() => {
    if (isOpen && currentFolderId) {
      const expanded = new Set<string>();
      // Expand all parent folders of current folder
      let folder = folders.find(f => f.id === currentFolderId);
      while (folder?.parentId) {
        expanded.add(folder.parentId);
        folder = folders.find(f => f.id === folder?.parentId);
      }
      setExpandedFolderIds(expanded);
    }
  }, [isOpen, currentFolderId, folders]);

  // Build folder tree
  const buildFolderTree = () => {
    const rootFolders = folders.filter(f => !f.parentId);
    const result: Array<{ folder: FolderItem; depth: number }> = [];

    const addFolder = (folder: FolderItem, depth: number) => {
      result.push({ folder, depth });

      // Add children if expanded
      if (expandedFolderIds.has(folder.id)) {
        const children = folders.filter(f => f.parentId === folder.id);
        children.forEach(child => addFolder(child, depth + 1));
      }
    };

    rootFolders.forEach(folder => addFolder(folder, 0));
    return result;
  };

  const folderTree = buildFolderTree();

  // Toggle folder expansion
  const toggleExpand = (folderId: string) => {
    setExpandedFolderIds(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Handle move
  const handleMove = () => {
    if (note && selectedFolderId && selectedFolderId !== currentFolderId) {
      onMove(note.id, selectedFolderId);
      onClose();
    }
  };

  // Check if folder has children
  const hasChildren = (folderId: string) => {
    return folders.some(f => f.parentId === folderId);
  };

  if (!isOpen || !note) return null;

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
          className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
          style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: colors.border }}>
            <h3 className="font-medium" style={{ color: colors.text }}>
              Move to Folder
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-white/10"
              style={{ color: colors.textMuted }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Note Info */}
          <div className="px-4 py-3 border-b" style={{ borderColor: colors.border, background: colors.hover }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{note.icon || '📄'}</span>
              <span className="text-sm font-medium truncate" style={{ color: colors.text }}>
                {note.title || 'Untitled'}
              </span>
            </div>
          </div>

          {/* Folder List */}
          <div className="max-h-96 overflow-y-auto py-2">
            {folderTree.map(({ folder, depth }) => {
              const isSelected = selectedFolderId === folder.id;
              const isCurrent = currentFolderId === folder.id;
              const isExpanded = expandedFolderIds.has(folder.id);
              const children = hasChildren(folder.id);

              return (
                <div key={folder.id}>
                  <button
                    onClick={() => setSelectedFolderId(folder.id)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left transition-colors"
                    style={{
                      paddingLeft: `${16 + depth * 20}px`,
                      background: isSelected ? colors.active : 'transparent',
                      color: colors.text,
                    }}
                  >
                    {/* Expand/Collapse Button */}
                    {children ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(folder.id);
                        }}
                        className="p-0.5 hover:bg-white/10 rounded"
                      >
                        <ChevronRight
                          size={14}
                          className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          style={{ color: colors.textMuted }}
                        />
                      </button>
                    ) : (
                      <div className="w-5" />
                    )}

                    {/* Folder Icon */}
                    {isExpanded && children ? (
                      <FolderOpen size={16} style={{ color: colors.accent }} />
                    ) : (
                      <Folder size={16} style={{ color: colors.textMuted }} />
                    )}

                    {/* Folder Name */}
                    <span className="flex-1 text-sm">
                      {folder.name}
                    </span>

                    {/* Current Indicator */}
                    {isCurrent && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: colors.hover, color: colors.textMuted }}>
                        Current
                      </span>
                    )}

                    {/* Selected Check */}
                    {isSelected && !isCurrent && (
                      <Check size={16} style={{ color: colors.accent }} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t flex items-center justify-end gap-2" style={{ borderColor: colors.border }}>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: colors.hover, color: colors.text }}
            >
              Cancel
            </button>
            <button
              onClick={handleMove}
              disabled={!selectedFolderId || selectedFolderId === currentFolderId}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: colors.accent, color: '#fff' }}
            >
              Move Here
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FolderMoveDialog;
