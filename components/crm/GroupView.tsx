// =============================================================================
// GROUP VIEW — Clean, tabbed group view with Notion-style banner
// =============================================================================
// Shows:
// - Overview: Banner, description, stats
// - Members: Member list with add/remove functionality
// - Notes: Notes about members
// - Topics: Topics from group notes
// - Activity: Updates and activity feed (placeholder)
// - Settings: Edit group, upload banner
// =============================================================================

import React, { useState, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Hash,
  Activity,
  Settings,
  Plus,
  X,
  ArrowRight,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Scan
} from 'lucide-react';
import { TabNavigation, TabItem } from '../ui/TabNavigation';
import { getGroupById, updateGroup, getMembers, addMember, removeMember } from '../../services/groupStore';
import { getAllContacts, getContactById, CONTACT_ZERO } from '../../services/contactStore';
import { getNotesByContactId, getNotesByAuthorId } from '../../services/noteStore';
import { getTopicsForContact, getTopicsForAuthor } from '../../services/topicStore';
import { Contact, Note, Topic, Group } from '../../types';

// --- PROPS ---

interface GroupViewProps {
  groupId: string;
  setSelectedContactId: (id: string) => void;
  onNavigateToDossier: () => void;
  onNavigateToGroup: (groupId: string) => void;
  onNavigateToTopic: (topicId: string) => void;
}

// --- COMPONENT ---

export const GroupView: React.FC<GroupViewProps> = ({
  groupId,
  setSelectedContactId,
  onNavigateToDossier,
  onNavigateToGroup,
  onNavigateToTopic,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Load group
  const group = getGroupById(groupId);
  if (!group) {
    return (
      <div className="text-center py-12 text-gray-500">
        Group not found
      </div>
    );
  }

  // Get members
  const memberIds = useMemo(() => getMembers(groupId), [groupId, refreshKey]);
  const members = useMemo(() => {
    return memberIds
      .map(id => getContactById(id))
      .filter(Boolean) as Contact[];
  }, [memberIds]);

  // Get notes: notes ABOUT any member + notes BY Contact Zero mentioning members
  const groupNotes = useMemo(() => {
    const notesAboutMembers: Note[] = [];
    const notesByContactZero: Note[] = [];

    // Notes about members
    memberIds.forEach(contactId => {
      const notes = getNotesByContactId(contactId);
      notesAboutMembers.push(...notes);
    });

    // Notes by Contact Zero that mention any member
    const contactZeroNotes = getNotesByAuthorId(CONTACT_ZERO.id);
    contactZeroNotes.forEach(note => {
      // Check if note is about a member
      if (memberIds.includes(note.contactId)) {
        notesByContactZero.push(note);
      }
    });

    // Combine and deduplicate by id
    const allNotes = [...notesAboutMembers, ...notesByContactZero];
    const uniqueNotes = Array.from(
      new Map(allNotes.map(note => [note.id, note])).values()
    );

    // Group by contact
    const grouped: Record<string, Note[]> = {};
    uniqueNotes.forEach(note => {
      const contactId = note.contactId;
      if (!grouped[contactId]) {
        grouped[contactId] = [];
      }
      grouped[contactId].push(note);
    });

    return grouped;
  }, [memberIds]);

  // Get topics from group notes
  const groupTopics = useMemo(() => {
    const topicMap = new Map<string, Topic>();

    // Get topics for each member
    memberIds.forEach(contactId => {
      const topics = getTopicsForContact(contactId);
      topics.forEach(topic => {
        topicMap.set(topic.id, topic);
      });
    });

    // Get topics from Contact Zero's notes about members
    const contactZeroTopics = getTopicsForAuthor(CONTACT_ZERO.id);
    contactZeroTopics.forEach(topic => {
      topicMap.set(topic.id, topic);
    });

    return Array.from(topicMap.values());
  }, [memberIds]);

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateGroup({ ...group, bannerUrl: dataUrl });
      setRefreshKey(k => k + 1);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBanner = () => {
    updateGroup({ ...group, bannerUrl: undefined });
    setRefreshKey(k => k + 1);
  };

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'members', label: 'Members', icon: Users, badge: members.length },
    { id: 'notes', label: 'Notes', icon: FileText, badge: Object.values(groupNotes).flat().length },
    { id: 'topics', label: 'Topics', icon: Hash, badge: groupTopics.length },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="space-y-0">
      {/* Group Header with Banner */}
      <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-t-xl overflow-hidden">
        {/* Banner Section */}
        {group.bannerUrl ? (
          <div className="relative h-48 w-full group">
            <img
              src={group.bannerUrl}
              alt="Group banner"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                onClick={() => bannerInputRef.current?.click()}
                className="px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] text-white text-sm font-bold rounded transition-colors"
              >
                Change Banner
              </button>
              <button
                onClick={handleRemoveBanner}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => bannerInputRef.current?.click()}
            className="h-32 w-full bg-gradient-to-br from-[#4433FF]/20 to-[#6A82FC]/10 flex items-center justify-center cursor-pointer hover:from-[#4433FF]/30 hover:to-[#6A82FC]/20 transition-all group"
          >
            <div className="text-center">
              <ImageIcon size={32} className="text-gray-600 group-hover:text-gray-400 mx-auto mb-2 transition-colors" />
              <p className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors">
                Click to add cover image
              </p>
            </div>
          </div>
        )}
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          onChange={handleBannerUpload}
          className="hidden"
        />

        {/* Group Title and Description */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users size={20} className="text-[#4433FF]" />
            <h1 className="text-2xl font-display font-bold text-white">{group.name}</h1>
          </div>
          {group.description && (
            <p className="text-sm text-gray-400 mb-4">
              {group.description}
            </p>
          )}

          {/* Quick Stats */}
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Users size={14} />
              <span>{members.length} members</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText size={14} />
              <span>{Object.values(groupNotes).flat().length} notes</span>
            </div>
            <div className="flex items-center gap-2">
              <Hash size={14} />
              <span>{groupTopics.length} topics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content */}
      <div className="bg-[#0E0E0E] border border-[#2A2A2A] border-t-0 rounded-b-xl p-6">
        {activeTab === 'overview' && (
          <OverviewTab
            group={group}
            members={members}
            groupNotes={groupNotes}
            groupTopics={groupTopics}
          />
        )}

        {activeTab === 'members' && (
          <MembersTab
            groupId={groupId}
            members={members}
            memberIds={memberIds}
            onContactClick={(contactId) => {
              setSelectedContactId(contactId);
              onNavigateToDossier();
            }}
            onRefresh={() => setRefreshKey(k => k + 1)}
          />
        )}

        {activeTab === 'notes' && (
          <NotesTab
            groupNotes={groupNotes}
            onContactClick={(contactId) => {
              setSelectedContactId(contactId);
              onNavigateToDossier();
            }}
          />
        )}

        {activeTab === 'topics' && (
          <TopicsTab
            groupTopics={groupTopics}
            onNavigateToTopic={onNavigateToTopic}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityTab group={group} />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            group={group}
            onRefresh={() => setRefreshKey(k => k + 1)}
          />
        )}
      </div>
    </div>
  );
};

// =============================================================================
// OVERVIEW TAB
// =============================================================================

interface OverviewTabProps {
  group: Group;
  members: Contact[];
  groupNotes: Record<string, Note[]>;
  groupTopics: Topic[];
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  group,
  members,
  groupNotes,
  groupTopics
}) => {
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1A1A1D] border border-[#333] rounded-xl p-4">
          <div className="text-2xl font-bold text-white mb-1">{members.length}</div>
          <div className="text-xs text-gray-500 uppercase tracking-widest">Members</div>
        </div>
        <div className="bg-[#1A1A1D] border border-[#333] rounded-xl p-4">
          <div className="text-2xl font-bold text-white mb-1">{Object.values(groupNotes).flat().length}</div>
          <div className="text-xs text-gray-500 uppercase tracking-widest">Notes</div>
        </div>
        <div className="bg-[#1A1A1D] border border-[#333] rounded-xl p-4">
          <div className="text-2xl font-bold text-white mb-1">{groupTopics.length}</div>
          <div className="text-xs text-gray-500 uppercase tracking-widest">Topics</div>
        </div>
      </div>

      {/* Recent Members */}
      {members.length > 0 && (
        <div>
          <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3">
            Recent Members
          </h3>
          <div className="flex -space-x-2">
            {members.slice(0, 8).map(member => (
              <img
                key={member.id}
                src={member.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`}
                alt={member.fullName}
                className="w-10 h-10 rounded-full border-2 border-[#0E0E0E] hover:z-10 transition-all hover:scale-110"
                title={member.fullName}
              />
            ))}
            {members.length > 8 && (
              <div className="w-10 h-10 rounded-full border-2 border-[#0E0E0E] bg-[#1A1A1D] flex items-center justify-center text-xs font-bold text-gray-400">
                +{members.length - 8}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Group Details */}
      <div className="pt-6 border-t border-[#2A2A2A]">
        <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3">
          Details
        </h3>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-600 mb-1">Created</div>
            <div className="text-sm text-white">{formatDate(group.createdAt)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Last Updated</div>
            <div className="text-sm text-white">{formatDate(group.updatedAt)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MEMBERS TAB
// =============================================================================

interface MembersTabProps {
  groupId: string;
  members: Contact[];
  memberIds: string[];
  onContactClick: (id: string) => void;
  onRefresh: () => void;
}

const MembersTab: React.FC<MembersTabProps> = ({
  groupId,
  members,
  memberIds,
  onContactClick,
  onRefresh
}) => {
  const [newMemberContactId, setNewMemberContactId] = useState('');

  // Get contacts not in group
  const availableContacts = useMemo(() => {
    return getAllContacts(false).filter(c => !memberIds.includes(c.id));
  }, [memberIds]);

  const handleAddMember = () => {
    if (!newMemberContactId) return;
    addMember({ groupId, contactId: newMemberContactId });
    setNewMemberContactId('');
    onRefresh();
  };

  const handleRemoveMember = (contactId: string) => {
    if (confirm('Remove this member from the group?')) {
      removeMember(groupId, contactId);
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Member Panel */}
      <div className="bg-[#1A1A1D] border border-[#333] rounded-xl p-4">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Plus size={16} /> Add Member
        </h3>
        <div className="flex gap-2">
          <select
            value={newMemberContactId}
            onChange={(e) => setNewMemberContactId(e.target.value)}
            className="flex-1 bg-[#0E0E0E] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
          >
            <option value="">Select contact...</option>
            {availableContacts.map(contact => (
              <option key={contact.id} value={contact.id}>
                {contact.fullName}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddMember}
            disabled={!newMemberContactId}
            className="px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] disabled:bg-[#333] disabled:cursor-not-allowed text-white text-xs font-bold rounded transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Member List */}
      {members.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {members.map(contact => (
            <div
              key={contact.id}
              className="flex items-center gap-3 p-3 bg-[#1A1A1D] border border-[#333] rounded-lg hover:border-[#4433FF] transition-colors group"
            >
              <img
                src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                alt={contact.fullName}
                className="w-12 h-12 rounded-full border border-[#333] cursor-pointer"
                onClick={() => onContactClick(contact.id)}
              />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onContactClick(contact.id)}>
                <div className="text-sm font-bold text-white hover:text-[#4433FF] transition-colors flex items-center gap-2">
                  {contact.fullName}
                  <ArrowRight size={12} className="opacity-0 group-hover:opacity-100" />
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {contact.relationshipRole} • {contact.relationshipDomain}
                </div>
              </div>
              {contact.id !== CONTACT_ZERO.id && (
                <button
                  onClick={() => handleRemoveMember(contact.id)}
                  className="p-1 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove from group"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-600">
          <Users size={48} className="mx-auto mb-4 text-gray-700" />
          <p className="mb-3">No members yet</p>
          <p className="text-xs text-gray-700">Add contacts to start building your group</p>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// NOTES TAB
// =============================================================================

interface NotesTabProps {
  groupNotes: Record<string, Note[]>;
  onContactClick: (id: string) => void;
}

const NotesTab: React.FC<NotesTabProps> = ({ groupNotes, onContactClick }) => {
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {Object.keys(groupNotes).length > 0 ? (
        Object.entries(groupNotes).map(([contactId, notes]) => {
          const contact = getContactById(contactId);
          if (!contact) return null;

          return (
            <div key={contactId} className="border-l-2 border-[#4433FF]/30 pl-4">
              <button
                onClick={() => onContactClick(contactId)}
                className="text-sm font-bold text-[#4433FF] hover:text-white transition-colors flex items-center gap-2 mb-3"
              >
                <img
                  src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                  alt={contact.fullName}
                  className="w-8 h-8 rounded-full border border-[#333]"
                />
                {contact.fullName}
                <ArrowRight size={12} />
              </button>
              <div className="space-y-3">
                {notes
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(note => (
                    <div key={note.id} className="bg-[#1A1A1D] border border-[#333] rounded-lg p-4">
                      <div className="text-[10px] text-gray-600 mb-2">
                        {formatDate(note.createdAt)}
                      </div>
                      <div className="text-sm text-gray-300 leading-relaxed">
                        {note.content}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-12 text-gray-600">
          <FileText size={48} className="mx-auto mb-4 text-gray-700" />
          <p>No notes yet</p>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// TOPICS TAB
// =============================================================================

interface TopicsTabProps {
  groupTopics: Topic[];
  onNavigateToTopic: (topicId: string) => void;
}

const TopicsTab: React.FC<TopicsTabProps> = ({ groupTopics, onNavigateToTopic }) => {
  return (
    <div>
      {groupTopics.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {groupTopics.map(topic => (
            <button
              key={topic.id}
              onClick={() => onNavigateToTopic(topic.id)}
              className="px-4 py-2 bg-[#1A1A1D] border border-[#333] hover:border-[#4433FF] text-[#4433FF] hover:text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              <Hash size={14} />
              {topic.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-600">
          <Hash size={48} className="mx-auto mb-4 text-gray-700" />
          <p>No topics yet</p>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// ACTIVITY TAB
// =============================================================================

interface ActivityTabProps {
  group: Group;
}

const ActivityTab: React.FC<ActivityTabProps> = ({ group }) => {
  return (
    <div className="text-center py-12">
      <Activity size={48} className="text-gray-600 mx-auto mb-4" />
      <h3 className="text-lg font-bold text-white mb-2">Group Activity</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
        Track member activity, updates, and group changes
      </p>
      <div className="text-xs text-gray-600">
        <p>Activity feed coming soon</p>
      </div>
    </div>
  );
};

// =============================================================================
// SETTINGS TAB
// =============================================================================

interface SettingsTabProps {
  group: Group;
  onRefresh: () => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ group, onRefresh }) => {
  const [editData, setEditData] = useState<Partial<Group>>({});
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    updateGroup({ ...group, ...editData });
    setEditData({});
    setIsEditing(false);
    onRefresh();
  };

  const handleCancel = () => {
    setEditData({});
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-white mb-4">Group Settings</h3>

        {!isEditing ? (
          <div className="space-y-4">
            <div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
                Group Name
              </div>
              <div className="text-sm text-white">{group.name}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
                Description
              </div>
              <div className="text-sm text-white">{group.description || 'No description'}</div>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] text-white text-xs font-bold rounded transition-colors flex items-center gap-2"
            >
              <Edit2 size={14} />
              Edit Group
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
                Group Name
              </label>
              <input
                type="text"
                value={editData.name ?? group.name}
                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
                Description
              </label>
              <textarea
                value={editData.description ?? group.description ?? ''}
                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] text-white text-xs font-bold rounded transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-[#1A1A1D] border border-[#333] hover:border-red-500 text-white text-xs font-bold rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Frame Scan Section */}
      <div className="pt-6 border-t border-[#2A2A2A]">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Scan size={16} className="text-[#4433FF]" />
          Frame Analysis
        </h3>
        <button className="w-full px-4 py-3 bg-gradient-to-r from-[#4433FF] to-[#6A82FC] hover:opacity-90 text-white text-sm font-bold rounded transition-opacity flex items-center justify-center gap-2">
          <Scan size={16} />
          Run Frame Scan
        </button>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Analyze group communication patterns
        </p>
      </div>
    </div>
  );
};

