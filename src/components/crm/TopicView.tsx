// =============================================================================
// TOPIC VIEW — View all notes and contacts linked to a topic
// =============================================================================
// Shows:
// - Topic title
// - "Contacts on this topic" strip with avatars
// - "Notes on this topic" list grouped by contact
// =============================================================================

import React, { useMemo } from 'react';
import { 
  Hash, FileText, Users, Clock, ArrowRight, ArrowLeft
} from 'lucide-react';
import { getTopicById, getNotesForTopic, getContactIdsForTopic, getNoteCountForTopic } from '../../services/topicStore';
import { getContactById } from '../../services/contactStore';
import { getAllGroups, getMembers } from '../../services/groupStore';
import { Note, Contact, Topic } from '../../types';

// --- PROPS ---

interface TopicViewProps {
  topicId: string;
  selectedContactId: string;
  setSelectedContactId: (id: string) => void;
  onNavigateToDossier: () => void;
  onNavigateToGroup?: (groupId: string) => void;
  onBack?: () => void;
}

// --- COMPONENT ---

export const TopicView: React.FC<TopicViewProps> = ({
  topicId,
  selectedContactId,
  setSelectedContactId,
  onNavigateToDossier,
  onNavigateToGroup,
  onBack
}) => {
  // Load topic
  const topic = getTopicById(topicId);

  // Get notes for this topic
  const notesForTopic = useMemo(() => getNotesForTopic(topicId), [topicId]);

  // Get unique contacts for this topic
  const contactIds = useMemo(() => getContactIdsForTopic(topicId), [topicId]);
  
  const contacts = useMemo(() => {
    return contactIds
      .map(id => getContactById(id))
      .filter(Boolean) as Contact[];
  }, [contactIds]);

  // Group notes by contact
  const notesByContact = useMemo(() => {
    const groups: Record<string, Note[]> = {};
    
    for (const note of notesForTopic) {
      if (!groups[note.contactId]) {
        groups[note.contactId] = [];
      }
      groups[note.contactId].push(note);
    }
    
    return groups;
  }, [notesForTopic]);

  // Get groups linked to this topic (groups where any member has notes with this topic)
  const linkedGroups = useMemo(() => {
    const allGroups = getAllGroups();
    return allGroups.filter(group => {
      const memberIds = getMembers(group.id);
      // Check if any member has notes with this topic
      return memberIds.some(memberId => contactIds.includes(memberId));
    });
  }, [contactIds]);

  // Handle contact click
  const handleContactClick = (contactId: string) => {
    setSelectedContactId(contactId);
    onNavigateToDossier();
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Truncate text
  const truncate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '…';
  };

  // Fallback if topic not found
  if (!topic) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Hash size={48} className="text-gray-700 mb-4" />
        <h3 className="text-lg font-bold text-gray-500 mb-2">Topic not found</h3>
        <p className="text-sm text-gray-600 max-w-sm">
          This topic may have been deleted or does not exist.
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 flex items-center gap-2 text-[#4433FF] hover:text-white transition-colors text-sm"
          >
            <ArrowLeft size={14} /> Go back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-[#1A1A1D] rounded transition-colors text-gray-500 hover:text-white"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="w-3 h-3 bg-purple-500 rounded-sm" />
          <h1 className="text-2xl font-display font-bold text-white tracking-wide flex items-center gap-2">
            <Hash size={24} className="text-purple-500" />
            {topic.label}
          </h1>
          <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30 font-bold uppercase">
            Topic
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <FileText size={14} />
            <span>{notesForTopic.length} notes</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Users size={14} />
            <span>{contacts.length} contacts</span>
          </div>
        </div>
      </div>

      {/* GROUPS LINKED TO THIS TOPIC */}
      {linkedGroups.length > 0 && (
        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-green-500" />
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Groups linked to this topic
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {linkedGroups.map(group => (
              <button
                key={group.id}
                onClick={() => {
                  if (onNavigateToGroup) {
                    onNavigateToGroup(group.id);
                  }
                }}
                className="px-3 py-1.5 bg-[#1A1A1D] border border-[#333] hover:border-[#4433FF] text-[#4433FF] hover:text-white text-xs font-bold rounded transition-colors flex items-center gap-2"
              >
                <Users size={12} />
                {group.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CONTACTS ON THIS TOPIC */}
      <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-[#4433FF]" />
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Contacts on this Topic
          </h3>
        </div>

        {contacts.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => handleContactClick(contact.id)}
                className="flex items-center gap-3 px-4 py-3 bg-[#1A1A1D] border border-[#333] rounded-lg hover:border-[#4433FF]/50 transition-colors group"
              >
                <img
                  src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                  alt={contact.fullName}
                  className="w-10 h-10 rounded-full border border-[#333] group-hover:border-[#4433FF]/50"
                />
                <div className="text-left">
                  <div className="text-sm font-bold text-white group-hover:text-[#4433FF] transition-colors flex items-center gap-1">
                    {contact.fullName}
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[10px] text-gray-500 capitalize">{contact.relationshipRole}</div>
                </div>
                <div className="ml-4 text-right">
                  <div className="text-lg font-display font-bold text-[#4433FF]">
                    {notesByContact[contact.id]?.length || 0}
                  </div>
                  <div className="text-[9px] text-gray-600 uppercase">notes</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-sm italic">No contacts linked to this topic yet</p>
        )}
      </div>

      {/* NOTES ON THIS TOPIC (grouped by contact) */}
      <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <FileText size={16} className="text-purple-500" />
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Notes on this Topic
          </h3>
        </div>

        {contacts.length > 0 ? (
          <div className="space-y-8">
            {contacts.map((contact) => {
              const contactNotes = notesByContact[contact.id] || [];
              if (contactNotes.length === 0) return null;

              return (
                <div key={contact.id}>
                  {/* Contact Header */}
                  <button
                    onClick={() => handleContactClick(contact.id)}
                    className="flex items-center gap-3 mb-4 group"
                  >
                    <img
                      src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                      alt={contact.fullName}
                      className="w-8 h-8 rounded-full border border-[#333]"
                    />
                    <div className="text-sm font-bold text-white group-hover:text-[#4433FF] transition-colors flex items-center gap-1">
                      {contact.fullName}
                      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex-1 h-px bg-[#2A2A2A]" />
                    <span className="text-xs text-gray-600">{contactNotes.length} notes</span>
                  </button>

                  {/* Notes for this contact */}
                  <div className="space-y-3 pl-11">
                    {contactNotes.map((note) => (
                      <div
                        key={note.id}
                        className="bg-[#1A1A1D] border border-[#333] rounded-lg p-4 hover:border-[#4433FF]/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Clock size={12} className="text-gray-600" />
                          <span className="text-[10px] text-gray-500">{formatDate(note.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-600 text-sm italic">No notes linked to this topic yet</p>
        )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Hash size={14} className="text-gray-600" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Topic</span>
          </div>
          <div className="text-xl font-display font-bold text-purple-400">{topic.label}</div>
          <div className="text-xs text-gray-600 font-mono">#{topic.slug}</div>
        </div>

        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className="text-gray-600" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Notes</span>
          </div>
          <div className="text-3xl font-display font-bold text-white">{notesForTopic.length}</div>
          <div className="text-xs text-gray-600">linked</div>
        </div>

        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-gray-600" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Contacts</span>
          </div>
          <div className="text-3xl font-display font-bold text-white">{contacts.length}</div>
          <div className="text-xs text-gray-600">connected</div>
        </div>
      </div>
    </div>
  );
};

