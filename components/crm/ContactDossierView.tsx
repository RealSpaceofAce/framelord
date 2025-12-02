// =============================================================================
// CONTACT DOSSIER VIEW — Detailed profile for any contact with in-place editing
// =============================================================================
// This component works for ANY contact, not just Contact Zero.
// It receives selectedContactId as a prop and renders that contact's details.
// Supports in-place editing of contact fields.
// Includes Notes section with add form.
// For Contact Zero: includes Activity feed showing actions taken about others.
// =============================================================================

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, TrendingUp, TrendingDown, Minus,
  Activity, Zap, Calendar, FileText, Mail, Phone,
  Tag, Clock, Edit2, Save, X, Send, ArrowRight, User
} from 'lucide-react';
import { getContactById, CONTACT_ZERO, updateContact, MOCK_CONTACTS } from '../../services/contactStore';
import { getNotesByContactId, getNotesByAuthorId, createNote } from '../../services/noteStore';
import { Contact, RelationshipDomain, ContactStatus, Note } from '../../types';

const MotionDiv = motion.div as any;

// --- PROPS ---

interface ContactDossierViewProps {
  selectedContactId: string;
  setSelectedContactId?: (id: string) => void;
  onNavigateToDossier?: () => void;
}

// --- EDIT FORM STATE TYPE ---

interface EditFormState {
  fullName: string;
  email: string;
  phone: string;
  relationshipDomain: RelationshipDomain;
  relationshipRole: string;
  status: ContactStatus;
  tags: string; // comma-separated
}

// --- COMPONENT ---

export const ContactDossierView: React.FC<ContactDossierViewProps> = ({ 
  selectedContactId,
  setSelectedContactId,
  onNavigateToDossier
}) => {
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // New note input state
  const [newNoteContent, setNewNoteContent] = useState('');
  
  // Get contact from store (re-fetch on refreshKey change)
  const contact = getContactById(selectedContactId);
  
  // Form state for editing
  const [formState, setFormState] = useState<EditFormState>({
    fullName: '',
    email: '',
    phone: '',
    relationshipDomain: 'business',
    relationshipRole: '',
    status: 'active',
    tags: '',
  });

  // Initialize form state when entering edit mode or when contact changes
  useEffect(() => {
    if (contact) {
      setFormState({
        fullName: contact.fullName,
        email: contact.email || '',
        phone: contact.phone || '',
        relationshipDomain: contact.relationshipDomain,
        relationshipRole: contact.relationshipRole,
        status: contact.status,
        tags: contact.tags.join(', '),
      });
    }
  }, [contact, isEditing]);

  // Reset edit mode when contact changes
  useEffect(() => {
    setIsEditing(false);
    setNewNoteContent('');
  }, [selectedContactId]);
  
  // Fallback if contact not found
  if (!contact) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Contact not found</p>
      </div>
    );
  }

  const isContactZero = contact.id === CONTACT_ZERO.id;
  
  // Notes ABOUT this contact
  const notesAboutContact = getNotesByContactId(contact.id);
  
  // For Contact Zero: notes written BY Contact Zero about OTHER contacts
  const activityNotes = isContactZero 
    ? getNotesByAuthorId(CONTACT_ZERO.id).filter(n => n.contactId !== CONTACT_ZERO.id)
    : [];

  // --- HANDLERS ---

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset form state to original contact values
    setFormState({
      fullName: contact.fullName,
      email: contact.email || '',
      phone: contact.phone || '',
      relationshipDomain: contact.relationshipDomain,
      relationshipRole: contact.relationshipRole,
      status: contact.status,
      tags: contact.tags.join(', '),
    });
    setIsEditing(false);
  };

  const handleSave = () => {
    // Validate: fullName is required
    if (!formState.fullName.trim()) {
      alert('Full name is required');
      return;
    }

    // Parse tags from comma-separated string
    const parsedTags = formState.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    // Construct updated contact object (no partial edits)
    const updatedContact: Contact = {
      ...contact,
      fullName: formState.fullName.trim(),
      email: formState.email.trim() || undefined,
      phone: formState.phone.trim() || undefined,
      relationshipDomain: formState.relationshipDomain,
      relationshipRole: formState.relationshipRole.trim(),
      status: formState.status,
      tags: parsedTags,
    };

    // Update in store
    updateContact(updatedContact);

    // Exit edit mode and refresh
    setIsEditing(false);
    setRefreshKey(k => k + 1);
  };

  const handleInputChange = (field: keyof EditFormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  // Handle adding a new note
  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;

    createNote({
      contactId: selectedContactId,
      authorContactId: CONTACT_ZERO.id,
      content: newNoteContent.trim(),
    });

    setNewNoteContent('');
    setRefreshKey(k => k + 1);
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  // Navigate to a contact's dossier (for Activity feed)
  const handleNavigateToContact = (contactId: string) => {
    if (setSelectedContactId) {
      setSelectedContactId(contactId);
    }
    if (onNavigateToDossier) {
      onNavigateToDossier();
    }
  };

  // --- HELPER COMPONENTS ---

  const TrendIcon: React.FC<{ trend: 'up' | 'down' | 'flat' }> = ({ trend }) => {
    if (trend === 'up') return <TrendingUp size={16} className="text-green-500" />;
    if (trend === 'down') return <TrendingDown size={16} className="text-red-500" />;
    return <Minus size={16} className="text-gray-500" />;
  };

  const scoreColor = contact.frame.currentScore >= 80 
    ? 'text-green-400' 
    : contact.frame.currentScore >= 60 
      ? 'text-yellow-400' 
      : 'text-red-400';

  const statusColor = (status: Contact['status']): string => {
    const colors: Record<Contact['status'], string> = {
      active: 'text-green-400 bg-green-500/20 border-green-500/30',
      dormant: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
      blocked: 'text-red-400 bg-red-500/20 border-red-500/30',
      testing: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    };
    return colors[status];
  };

  const domainColor = (domain: Contact['relationshipDomain']): string => {
    const colors: Record<Contact['relationshipDomain'], string> = {
      business: 'text-blue-400 bg-blue-500/20',
      personal: 'text-purple-400 bg-purple-500/20',
      hybrid: 'text-orange-400 bg-orange-500/20',
    };
    return colors[domain];
  };

  // Truncate content for snippets
  const truncate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '…';
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // --- INPUT STYLES ---
  const inputClass = "w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none";
  const selectClass = "w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none cursor-pointer";
  const labelClass = "text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block";

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-[#4433FF] rounded-sm" />
          <h1 className="text-2xl font-display font-bold text-white tracking-wide">
            CONTACT DOSSIER
          </h1>
          {isContactZero && (
            <span className="text-[10px] bg-[#4433FF]/20 text-[#4433FF] px-2 py-0.5 rounded border border-[#4433FF]/30 font-bold uppercase">
              Identity Prime
            </span>
          )}
          {isEditing && (
            <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded border border-orange-500/30 font-bold uppercase animate-pulse">
              Editing…
            </span>
          )}
        </div>

        {/* Edit / Save / Cancel Buttons */}
        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1D] border border-[#333] hover:border-[#4433FF] text-white text-xs font-bold rounded transition-colors"
            >
              <Edit2 size={14} /> Edit
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1D] border border-[#333] hover:border-red-500 text-white text-xs font-bold rounded transition-colors"
              >
                <X size={14} /> Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] text-white text-xs font-bold rounded transition-colors"
              >
                <Save size={14} /> Save
              </button>
            </>
          )}
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: Identity Card */}
        <div className={`bg-[#0E0E0E] border rounded-xl p-6 shadow-[0_0_30px_rgba(68,51,255,0.1)] ${
          isContactZero ? 'border-[#4433FF]/30' : 'border-[#2A2A2A]'
        }`}>
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-4">
              <img 
                src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                alt={contact.fullName}
                className={`w-28 h-28 rounded-full border-4 shadow-[0_0_20px_rgba(68,51,255,0.3)] ${
                  isContactZero ? 'border-[#4433FF]' : 'border-[#333]'
                }`}
              />
              {contact.status === 'active' && !isEditing && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-[#0E0E0E] flex items-center justify-center">
                  <Zap size={12} className="text-white" />
                </div>
              )}
            </div>
            
            {/* Full Name */}
            {isEditing ? (
              <div className="w-full mb-4">
                <label className={labelClass}>Full Name *</label>
                <input
                  type="text"
                  value={formState.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className={`${inputClass} text-center font-display font-bold text-xl`}
                  placeholder="Full Name"
                />
              </div>
            ) : (
              <h2 className="text-2xl font-display font-bold text-white">{contact.fullName}</h2>
            )}
            
            {/* Role */}
            {isEditing ? (
              <div className="w-full mb-4">
                <label className={labelClass}>Role</label>
                <input
                  type="text"
                  value={formState.relationshipRole}
                  onChange={(e) => handleInputChange('relationshipRole', e.target.value)}
                  className={`${inputClass} text-center`}
                  placeholder="e.g., prospect, client, friend"
                />
              </div>
            ) : (
              <p className="text-xs text-gray-500 mt-1 font-mono uppercase tracking-wider">
                {contact.relationshipRole}
              </p>
            )}

            {/* Domain & Status */}
            {isEditing ? (
              <div className="w-full space-y-4 mt-2">
                <div>
                  <label className={labelClass}>Domain</label>
                  <select
                    value={formState.relationshipDomain}
                    onChange={(e) => handleInputChange('relationshipDomain', e.target.value as RelationshipDomain)}
                    className={selectClass}
                  >
                    <option value="business">Business</option>
                    <option value="personal">Personal</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={formState.status}
                    onChange={(e) => handleInputChange('status', e.target.value as ContactStatus)}
                    className={selectClass}
                  >
                    <option value="active">Active</option>
                    <option value="dormant">Dormant</option>
                    <option value="blocked">Blocked</option>
                    <option value="testing">Testing</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 mt-3">
                <span className={`text-[10px] px-2 py-1 rounded uppercase font-bold ${domainColor(contact.relationshipDomain)}`}>
                  {contact.relationshipDomain}
                </span>
                <span className={`text-[10px] px-2 py-1 rounded border uppercase font-bold ${statusColor(contact.status)}`}>
                  {contact.status}
                </span>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-3 border-t border-[#2A2A2A] pt-4">
            {isEditing ? (
              <>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={inputClass}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="tel"
                    value={formState.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={inputClass}
                    placeholder="+1 555 000 0000"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Mail size={12} /> Email
                  </span>
                  <span className="text-white font-mono text-xs">{contact.email || '—'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Phone size={12} /> Phone
                  </span>
                  <span className="text-white font-mono text-xs">{contact.phone || '—'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* CENTER: Frame Metrics */}
        <div className="space-y-6">
          {/* Frame Score */}
          <MotionDiv 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#4433FF] to-[#737AFF]" />
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-[#4433FF]" />
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Frame Score</h3>
            </div>
            <div className="flex items-end gap-4">
              <span className={`text-6xl font-display font-bold ${scoreColor}`}>
                {contact.frame.currentScore}
              </span>
              <div className="flex items-center gap-1 mb-2">
                <TrendIcon trend={contact.frame.trend} />
                <span className="text-xs text-gray-400 uppercase">{contact.frame.trend}</span>
              </div>
            </div>
            <div className="mt-4 h-2 bg-[#1A1A1D] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#4433FF] to-[#737AFF] transition-all duration-500"
                style={{ width: `${contact.frame.currentScore}%` }}
              />
            </div>
          </MotionDiv>

          {/* Timeline */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-green-500" />
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Timeline</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Last Contact</span>
                <span className="text-sm text-white font-mono">
                  {contact.lastContactAt 
                    ? new Date(contact.lastContactAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : '—'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Next Action</span>
                <span className={`text-sm font-mono ${contact.nextActionAt ? 'text-[#4433FF]' : 'text-gray-600'}`}>
                  {contact.nextActionAt 
                    ? new Date(contact.nextActionAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : '—'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Last Scan</span>
                <span className="text-sm text-white font-mono">
                  {contact.frame.lastScanAt 
                    ? new Date(contact.frame.lastScanAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : 'Never'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Tag size={16} className="text-orange-500" />
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tags</h3>
            </div>
            {isEditing ? (
              <div>
                <input
                  type="text"
                  value={formState.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  className={inputClass}
                  placeholder="tag1, tag2, tag3"
                />
                <p className="text-[10px] text-gray-600 mt-2">Separate tags with commas</p>
              </div>
            ) : contact.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {contact.tags.map((tag) => (
                  <span 
                    key={tag}
                    className="text-xs px-3 py-1 rounded-full bg-[#4433FF]/20 text-[#737AFF] border border-[#4433FF]/30"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm italic">No tags set</p>
            )}
          </div>
        </div>

        {/* RIGHT: Notes Section */}
        <div className="space-y-6">
          {/* Notes ABOUT this contact */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-[#4433FF]" />
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Notes {!isContactZero && 'About'}
              </h3>
              <span className="text-[10px] text-gray-600 ml-auto">{notesAboutContact.length} total</span>
            </div>

            {/* Add Note Form */}
            <div className="mb-4">
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                onKeyDown={handleNoteKeyDown}
                placeholder={`Add a note ${isContactZero ? '' : `about ${contact.fullName}`}...`}
                className="w-full bg-[#1A1A1D] border border-[#333] rounded-lg p-3 text-white text-sm resize-none focus:border-[#4433FF] outline-none"
                rows={2}
              />
              <button
                onClick={handleAddNote}
                disabled={!newNoteContent.trim()}
                className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#4433FF] hover:bg-[#5544FF] disabled:bg-[#333] disabled:cursor-not-allowed text-white text-xs font-bold rounded transition-colors"
              >
                <Send size={12} /> Add Note
              </button>
            </div>

            {/* Recent Notes */}
            {notesAboutContact.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {notesAboutContact.slice(0, 5).map((note) => (
                  <div 
                    key={note.id}
                    className="border-l-2 border-[#4433FF]/30 pl-3 py-1"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={10} className="text-gray-600" />
                      <span className="text-[10px] text-gray-500">
                        {formatDate(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      {truncate(note.content, 100)}
                    </p>
                  </div>
                ))}
                {notesAboutContact.length > 5 && (
                  <p className="text-xs text-gray-600 pl-3">+{notesAboutContact.length - 5} more notes</p>
                )}
              </div>
            ) : (
              <p className="text-gray-600 text-sm italic">No notes yet</p>
            )}
          </div>
        </div>
      </div>

      {/* CONTACT ZERO ONLY: Activity Feed (what you did about others) */}
      {isContactZero && activityNotes.length > 0 && (
        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity size={16} className="text-green-500" />
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Your Activity (Notes About Others)
            </h3>
            <span className="text-[10px] text-gray-600 ml-auto">{activityNotes.length} entries</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activityNotes.slice(0, 6).map((note) => {
              const targetContact = getContactById(note.contactId);
              if (!targetContact) return null;

              return (
                <div 
                  key={note.id}
                  className="bg-[#1A1A1D] border border-[#333] rounded-lg p-4 hover:border-[#4433FF]/50 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img 
                      src={targetContact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetContact.id}`}
                      alt={targetContact.fullName}
                      className="w-8 h-8 rounded-full border border-[#333]"
                    />
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => handleNavigateToContact(targetContact.id)}
                        className="text-sm font-bold text-[#4433FF] hover:text-white transition-colors flex items-center gap-1 truncate"
                      >
                        {targetContact.fullName}
                        <ArrowRight size={12} />
                      </button>
                      <div className="text-[10px] text-gray-500">{formatDate(note.createdAt)}</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {truncate(note.content, 80)}
                  </p>
                </div>
              );
            })}
          </div>

          {activityNotes.length > 6 && (
            <p className="text-xs text-gray-600 mt-4 text-center">
              +{activityNotes.length - 6} more activity entries
            </p>
          )}
        </div>
      )}

      {/* BOTTOM: Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className="text-gray-600" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Notes</span>
          </div>
          <div className="text-3xl font-display font-bold text-white">{notesAboutContact.length}</div>
          <div className="text-xs text-gray-600">entries</div>
        </div>

        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-gray-600" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Frame</span>
          </div>
          <div className={`text-3xl font-display font-bold ${scoreColor}`}>
            {contact.frame.currentScore}
          </div>
          <div className="text-xs text-gray-600">score</div>
        </div>

        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-gray-600" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Trend</span>
          </div>
          <div className="text-3xl font-display font-bold text-white flex items-center gap-2">
            <TrendIcon trend={contact.frame.trend} />
            <span className="capitalize">{contact.frame.trend}</span>
          </div>
          <div className="text-xs text-gray-600">momentum</div>
        </div>

        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Tag size={14} className="text-gray-600" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tags</span>
          </div>
          <div className="text-3xl font-display font-bold text-white">{contact.tags.length}</div>
          <div className="text-xs text-gray-600">labels</div>
        </div>
      </div>
    </div>
  );
};
