// =============================================================================
// GROUP VIEW — View a single group with members, notes, and topics
// =============================================================================
// Shows:
// - Group name, description, stats
// - Member list with remove functionality
// - Add member panel
// - Notes section (notes about members + notes by Contact Zero mentioning members)
// - Topics section (topics from these notes)
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  Users, FileText, Hash, Plus, X, ArrowRight, User, Tag, Scan
} from 'lucide-react';
import { getGroupById, getMembers, addMember, removeMember } from '../../services/groupStore';
import { getAllContacts, getContactById, CONTACT_ZERO } from '../../services/contactStore';
import { getNotesByContactId, getNotesByAuthorId, getAllNotes } from '../../services/noteStore';
import { getTopicsForContact, getTopicsForAuthor } from '../../services/topicStore';
import { Contact, Note, Topic } from '../../types';

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
  const [refreshKey, setRefreshKey] = useState(0);
  const [newMemberContactId, setNewMemberContactId] = useState<string>('');

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

  // Get contacts not in group
  const availableContacts = useMemo(() => {
    return getAllContacts(false).filter(c => !memberIds.includes(c.id));
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

  // Handlers
  const handleAddMember = () => {
    if (!newMemberContactId) return;
    addMember({ groupId, contactId: newMemberContactId });
    setNewMemberContactId('');
    setRefreshKey(k => k + 1);
  };

  const handleRemoveMember = (contactId: string) => {
    removeMember(groupId, contactId);
    setRefreshKey(k => k + 1);
  };

  const handleContactClick = (contactId: string) => {
    setSelectedContactId(contactId);
    onNavigateToDossier();
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Users size={20} className="text-[#4433FF]" />
          <h1 className="text-2xl font-display font-bold text-white">{group.name}</h1>
        </div>
        {group.description && (
          <p className="text-sm text-gray-400 mb-4">{group.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{members.length} members</span>
          <span>•</span>
          <span>{groupTopics.length} topics</span>
          <span>•</span>
          <span>{Object.values(groupNotes).flat().length} notes</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Members */}
        <div className="space-y-6">
          {/* Add Member Panel */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-4">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Plus size={16} /> Add Member
            </h3>
            <div className="flex gap-2">
              <select
                value={newMemberContactId}
                onChange={(e) => setNewMemberContactId(e.target.value)}
                className="flex-1 bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
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
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Users size={16} /> Members ({members.length})
            </h3>
            {members.length > 0 ? (
              <div className="space-y-2">
                {members.map(contact => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 p-3 bg-[#1A1A1D] border border-[#333] rounded-lg hover:border-[#4433FF] transition-colors"
                  >
                    <img
                      src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                      alt={contact.fullName}
                      className="w-10 h-10 rounded-full border border-[#333]"
                    />
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => handleContactClick(contact.id)}
                        className="text-sm font-bold text-white hover:text-[#4433FF] transition-colors text-left w-full flex items-center gap-2"
                      >
                        {contact.fullName}
                        <ArrowRight size={12} className="opacity-0 group-hover:opacity-100" />
                      </button>
                      <div className="text-xs text-gray-400 mt-1">
                        {contact.relationshipRole} • {contact.relationshipDomain}
                      </div>
                    </div>
                    {contact.id !== CONTACT_ZERO.id && (
                      <button
                        onClick={() => handleRemoveMember(contact.id)}
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                        title="Remove from group"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm italic">No members yet</p>
            )}
          </div>
        </div>

        {/* Right: Notes and Topics */}
        <div className="space-y-6">
          {/* Notes Section */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <FileText size={16} /> Notes ({Object.values(groupNotes).flat().length})
            </h3>
            {Object.keys(groupNotes).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(groupNotes).map(([contactId, notes]) => {
                  const contact = getContactById(contactId);
                  if (!contact) return null;

                  return (
                    <div key={contactId} className="border-l-2 border-[#4433FF]/30 pl-3">
                      <button
                        onClick={() => handleContactClick(contactId)}
                        className="text-sm font-bold text-[#4433FF] hover:text-white transition-colors flex items-center gap-2 mb-2"
                      >
                        {contact.fullName}
                        <ArrowRight size={12} />
                      </button>
                      <div className="space-y-2">
                        {notes
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .slice(0, 3)
                          .map(note => (
                            <div key={note.id} className="text-xs text-gray-400">
                              <div className="text-[10px] text-gray-600 mb-1">
                                {formatDate(note.createdAt)}
                              </div>
                              <div className="text-sm text-gray-300 leading-relaxed">
                                {note.content.length > 120
                                  ? note.content.slice(0, 120) + '…'
                                  : note.content}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-600 text-sm italic">No notes yet</p>
            )}
          </div>

          {/* Topics Section */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Hash size={16} /> Topics ({groupTopics.length})
            </h3>
            {groupTopics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {groupTopics.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => onNavigateToTopic(topic.id)}
                    className="px-3 py-1.5 bg-[#1A1A1D] border border-[#333] hover:border-[#4433FF] text-[#4433FF] hover:text-white text-xs font-bold rounded transition-colors flex items-center gap-2"
                  >
                    <Hash size={12} />
                    {topic.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm italic">No topics yet</p>
            )}
          </div>

          {/* Frame Scan Section */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Scan size={16} className="text-[#4433FF]" />
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Frame Analysis</h3>
            </div>
            <button className="w-full px-4 py-3 bg-gradient-to-r from-[#4433FF] to-[#6A82FC] hover:opacity-90 text-white text-sm font-bold rounded transition-opacity flex items-center justify-center gap-2">
              <Scan size={16} />
              Run Frame Scan
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Analyze group communication patterns
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

