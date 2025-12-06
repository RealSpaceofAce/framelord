// =============================================================================
// GROUPS VIEW — Groups Dashboard
// =============================================================================
// Two-pane layout:
// - Left: List of groups with edit/delete and "Add Group" panel
// - Right: Selected GroupView when a group is chosen
// =============================================================================

import React, { useState } from 'react';
import {
  Users, Plus, Edit2, Trash2, X, Save
} from 'lucide-react';
import { getAllGroups, createGroup, updateGroup, deleteGroup, getMembers } from '../../services/groupStore';
import { GroupView } from './GroupView';
import { Group } from '../../types';

// --- PROPS ---

interface GroupsViewProps {
  selectedContactId: string;
  setSelectedContactId: (id: string) => void;
  onNavigateToDossier: () => void;
  onNavigateToGroup: (groupId: string) => void;
  onNavigateToTopic: (topicId: string) => void;
}

// --- COMPONENT ---

export const GroupsView: React.FC<GroupsViewProps> = ({
  selectedContactId,
  setSelectedContactId,
  onNavigateToDossier,
  onNavigateToGroup,
  onNavigateToTopic,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');

  const groups = getAllGroups();

  // Handlers
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;

    const newGroup = createGroup({
      name: newGroupName.trim(),
      description: newGroupDescription.trim() || undefined,
    });

    setNewGroupName('');
    setNewGroupDescription('');
    setIsAddingGroup(false);
    setSelectedGroupId(newGroup.id);
    setRefreshKey(k => k + 1);
  };

  const handleStartEdit = (group: Group) => {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    setEditGroupDescription(group.description || '');
  };

  const handleCancelEdit = () => {
    setEditingGroupId(null);
    setEditGroupName('');
    setEditGroupDescription('');
  };

  const handleSaveEdit = () => {
    if (!editingGroupId || !editGroupName.trim()) return;

    const group = groups.find(g => g.id === editingGroupId);
    if (!group) return;

    updateGroup({
      ...group,
      name: editGroupName.trim(),
      description: editGroupDescription.trim() || undefined,
    });

    setEditingGroupId(null);
    setEditGroupName('');
    setEditGroupDescription('');
    setRefreshKey(k => k + 1);
  };

  const handleDeleteGroup = (id: string) => {
    if (window.confirm('Delete this group? All memberships will be removed.')) {
      deleteGroup(id);
      if (selectedGroupId === id) {
        setSelectedGroupId(null);
      }
      setRefreshKey(k => k + 1);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users size={20} className="text-[#4433FF]" />
        <h1 className="text-2xl font-display font-bold text-white">Groups</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Groups List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Add Group Panel */}
          {isAddingGroup ? (
            <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">New Group</h3>
                <button
                  onClick={() => {
                    setIsAddingGroup(false);
                    setNewGroupName('');
                    setNewGroupDescription('');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name"
                  className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
                  autoFocus
                />
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none resize-none"
                  rows={2}
                />
                <button
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim()}
                  className="w-full px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] disabled:bg-[#333] disabled:cursor-not-allowed text-white text-xs font-bold rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={14} /> Create
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingGroup(true)}
              className="w-full px-4 py-2 bg-[#1A1A1D] border border-[#333] hover:border-[#4433FF] text-white text-xs font-bold rounded transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={14} /> Add Group
            </button>
          )}

          {/* Groups List */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-4 space-y-2">
            {groups.length > 0 ? (
              groups.map(group => {
                const memberCount = getMembers(group.id).length;
                const isEditing = editingGroupId === group.id;
                const isSelected = selectedGroupId === group.id;

                return (
                  <div
                    key={group.id}
                    className={`p-3 bg-[#1A1A1D] border rounded-lg transition-colors ${
                      isSelected
                        ? 'border-[#4433FF] bg-[#4433FF]/10'
                        : 'border-[#333] hover:border-[#4433FF]/50'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editGroupName}
                          onChange={(e) => setEditGroupName(e.target.value)}
                          className="w-full bg-[#0E0E0E] border border-[#333] rounded px-2 py-1 text-white text-xs focus:border-[#4433FF] outline-none"
                          autoFocus
                        />
                        <textarea
                          value={editGroupDescription}
                          onChange={(e) => setEditGroupDescription(e.target.value)}
                          className="w-full bg-[#0E0E0E] border border-[#333] rounded px-2 py-1 text-white text-xs focus:border-[#4433FF] outline-none resize-none"
                          rows={2}
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={handleSaveEdit}
                            className="flex-1 px-2 py-1 bg-[#4433FF] hover:bg-[#5544FF] text-white text-xs font-bold rounded transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex-1 px-2 py-1 bg-[#1A1A1D] border border-[#333] hover:border-red-500 text-white text-xs font-bold rounded transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <button
                            onClick={() => setSelectedGroupId(group.id)}
                            className="text-sm font-bold text-white hover:text-[#4433FF] transition-colors text-left flex-1"
                          >
                            {group.name}
                          </button>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleStartEdit(group)}
                              className="p-1 text-gray-400 hover:text-[#4433FF] transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteGroup(group.id)}
                              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        {group.description && (
                          <p className="text-xs text-gray-500 mb-1">{group.description}</p>
                        )}
                        <div className="text-xs text-gray-600">{memberCount} members</div>
                      </>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-gray-600 text-sm italic text-center py-4">No groups yet</p>
            )}
          </div>
        </div>

        {/* Right: Selected Group View */}
        <div className="lg:col-span-2">
          {selectedGroupId ? (
            <GroupView
              groupId={selectedGroupId}
              setSelectedContactId={setSelectedContactId}
              onNavigateToDossier={onNavigateToDossier}
              onNavigateToGroup={onNavigateToGroup}
              onNavigateToTopic={onNavigateToTopic}
            />
          ) : (
            <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-12 text-center">
              <Users size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">Select a group to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};







