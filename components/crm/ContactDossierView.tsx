// =============================================================================
// CONTACT DOSSIER VIEW — Detailed profile for any contact with in-place editing
// =============================================================================
// This component works for ANY contact, not just Contact Zero.
// It receives selectedContactId as a prop and renders that contact's details.
// Supports in-place editing of contact fields.
// Includes Notes section with add form.
// Includes Tasks section with add form.
// For Contact Zero: includes Activity feed, Topics, and Open Tasks summary.
// =============================================================================

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, TrendingUp, TrendingDown, Minus,
  Activity, Zap, Calendar, FileText, Mail, Phone,
  Tag, Clock, Edit2, Save, X, Send, ArrowRight, User, Hash,
  CheckSquare, Square, Plus, AlertCircle, PhoneCall, Users, MessageSquare, AtSign,
  Trash2, Paperclip, Image, File, Layout
} from 'lucide-react';
import { getContactById, CONTACT_ZERO, updateContact } from '../../services/contactStore';
import { getNotesByContactId, getNotesByAuthorId, createNote } from '../../services/noteStore';
import { getTopicsForContact, getTopicsForAuthor } from '../../services/topicStore';
import { 
  getInteractionsByContactId, 
  getInteractionsByAuthorId, 
  createInteraction,
  updateInteraction,
  deleteInteraction,
  addAttachmentToInteraction,
  removeAttachmentFromInteraction
} from '../../services/interactionStore';
import { 
  getOpenTasksByContactId, 
  getTasksByContactId, 
  createTask, 
  updateTaskStatus,
  getOpenTasksGroupedByContact,
  getOpenTasksByDate,
  getOpenTasksByDateRange,
  formatDueTime,
  hasTimeComponent
} from '../../services/taskStore';
import {
  getPipelineItemsByContact,
  getPipelineTemplateById,
} from '../../services/pipelineStore';
import { Contact, RelationshipDomain, ContactStatus, Topic, Task, Interaction, InteractionType, InteractionAttachment } from '../../types';

const MotionDiv = motion.div as any;

// --- PROPS ---

interface ContactDossierViewProps {
  selectedContactId: string;
  setSelectedContactId?: (id: string) => void;
  onNavigateToDossier?: () => void;
  onNavigateToTopic?: (topicId: string) => void;
}

// --- EDIT FORM STATE TYPE ---

interface EditFormState {
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  company: string;
  title: string;
  location: string;
  linkedinUrl: string;
  xHandle: string;
  relationshipDomain: RelationshipDomain;
  relationshipRole: string;
  status: ContactStatus;
  tags: string; // comma-separated
}

// --- COMPONENT ---

export const ContactDossierView: React.FC<ContactDossierViewProps> = ({ 
  selectedContactId,
  setSelectedContactId,
  onNavigateToDossier,
  onNavigateToTopic
}) => {
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // New note input state
  const [newNoteContent, setNewNoteContent] = useState('');
  
  // New task input state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  
  // New interaction input state
  const [newInteractionType, setNewInteractionType] = useState<InteractionType>('call');
  const [newInteractionSummary, setNewInteractionSummary] = useState('');
  const [newInteractionOccurredAt, setNewInteractionOccurredAt] = useState('');
  
  // Interaction editing state
  const [editingInteractionId, setEditingInteractionId] = useState<string | null>(null);
  const [editInteractionForm, setEditInteractionForm] = useState<{
    type: InteractionType;
    occurredAt: string;
    summary: string;
  } | null>(null);
  
  // Get contact from store (re-fetch on refreshKey change)
  const contact = getContactById(selectedContactId);
  
  // Form state for editing
  const [formState, setFormState] = useState<EditFormState>({
    fullName: '',
    email: '',
    phone: '',
    avatarUrl: '',
    company: '',
    title: '',
    location: '',
    linkedinUrl: '',
    xHandle: '',
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
        avatarUrl: contact.avatarUrl || '',
        company: contact.company || '',
        title: contact.title || '',
        location: contact.location || '',
        linkedinUrl: contact.linkedinUrl || '',
        xHandle: contact.xHandle || '',
        relationshipDomain: contact.relationshipDomain,
        relationshipRole: contact.relationshipRole,
        status: contact.status,
        tags: contact.tags.join(', '),
      });
    }
  }, [contact, isEditing]);

  // Reset state when contact changes
  useEffect(() => {
    setIsEditing(false);
    setNewNoteContent('');
    setNewTaskTitle('');
    setNewTaskDueDate('');
    setNewInteractionType('call');
    setNewInteractionSummary('');
    setNewInteractionOccurredAt('');
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
  const isArchived = contact.status === 'archived';
  
  // Notes ABOUT this contact
  const notesAboutContact = getNotesByContactId(contact.id);
  
  // Tasks for this contact
  const openTasks = getOpenTasksByContactId(selectedContactId);
  const allTasks = getTasksByContactId(selectedContactId);
  
  // For Contact Zero: notes written BY Contact Zero about OTHER contacts
  const activityNotes = isContactZero 
    ? getNotesByAuthorId(CONTACT_ZERO.id).filter(n => n.contactId !== CONTACT_ZERO.id)
    : [];

  // Topics linked to notes ABOUT this contact
  const topicsForContact = getTopicsForContact(selectedContactId);

  // For Contact Zero: all topics from notes written by them
  const topicsForAuthor = isContactZero ? getTopicsForAuthor(CONTACT_ZERO.id) : [];

  // Pipeline items for this contact
  const pipelineItems = getPipelineItemsByContact(selectedContactId);

  // For Contact Zero: open tasks grouped by contact (what you owe to others)
  const openTasksByContact = isContactZero ? getOpenTasksGroupedByContact() : new Map();

  // For Contact Zero: Today & Upcoming tasks (next 7 days)
  const getTodayKey = (): string => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getDatePlusDays = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayKey = getTodayKey();
  const weekEndKey = getDatePlusDays(7);
  
  // Get upcoming tasks grouped by date for Contact Zero
  const upcomingTasksByDate = isContactZero 
    ? (() => {
        const tasks = getOpenTasksByDateRange(todayKey, weekEndKey);
        const grouped: Record<string, Task[]> = {};
        tasks.forEach(task => {
          if (task.dueAt) {
            const dateKey = task.dueAt.split('T')[0];
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(task);
          }
        });
        return grouped;
      })()
    : {};

  const upcomingDates = Object.keys(upcomingTasksByDate).sort();

  const formatUpcomingDateHeader = (dateKey: string): string => {
    if (dateKey === todayKey) return 'Today';
    if (dateKey === getDatePlusDays(1)) return 'Tomorrow';
    const date = new Date(dateKey + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Timeline: Merge Interactions and Notes for this contact
  type TimelineItem = {
    type: 'interaction' | 'note';
    interaction?: Interaction;  // Full interaction object for interactions
    interactionType?: InteractionType;
    occurredAt: string;
    summary: string;
    id: string;
  };

  const timelineItems: TimelineItem[] = (() => {
    const interactions = getInteractionsByContactId(selectedContactId);
    const notes = getNotesByContactId(selectedContactId);

    const items: TimelineItem[] = [
      ...interactions.map(i => ({
        type: 'interaction' as const,
        interaction: i,
        interactionType: i.type,
        occurredAt: i.occurredAt,
        summary: i.summary,
        id: i.id,
      })),
      ...notes.map(n => ({
        type: 'note' as const,
        occurredAt: n.createdAt,
        summary: n.content.length > 120 ? n.content.slice(0, 120) + '…' : n.content,
        id: n.id,
      })),
    ];

    return items.sort((a, b) => {
      return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
    });
  })();

  // For Contact Zero: Last interactions authored by Contact Zero
  const lastInteractions = isContactZero 
    ? getInteractionsByAuthorId(CONTACT_ZERO.id).slice(0, 10)
    : [];

  // --- HANDLERS ---

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormState({
      fullName: contact.fullName,
      email: contact.email || '',
      phone: contact.phone || '',
      avatarUrl: contact.avatarUrl || '',
      company: contact.company || '',
      title: contact.title || '',
      location: contact.location || '',
      linkedinUrl: contact.linkedinUrl || '',
      xHandle: contact.xHandle || '',
      relationshipDomain: contact.relationshipDomain,
      relationshipRole: contact.relationshipRole,
      status: contact.status,
      tags: contact.tags.join(', '),
    });
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!formState.fullName.trim()) {
      alert('Full name is required');
      return;
    }

    const parsedTags = formState.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const updatedContact: Contact = {
      ...contact,
      fullName: formState.fullName.trim(),
      email: formState.email.trim() || undefined,
      phone: formState.phone.trim() || undefined,
      avatarUrl: formState.avatarUrl.trim() || undefined,
      company: formState.company.trim() || undefined,
      title: formState.title.trim() || undefined,
      location: formState.location.trim() || undefined,
      linkedinUrl: formState.linkedinUrl.trim() || undefined,
      xHandle: formState.xHandle.trim() || undefined,
      relationshipDomain: formState.relationshipDomain,
      relationshipRole: formState.relationshipRole.trim(),
      status: formState.status,
      tags: parsedTags,
    };

    updateContact(updatedContact);
    setIsEditing(false);
    setRefreshKey(k => k + 1);
  };

  const handleInputChange = (field: keyof EditFormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  // Handle avatar file upload
  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Optional: basic file size guard (2MB)
    if (file.size > 2 * 1024 * 1024) {
      console.warn('Avatar file is larger than 2MB, but accepting it anyway');
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setFormState(prev => ({ ...prev, avatarUrl: dataUrl }));
      }
    };
    reader.onerror = () => {
      console.error('Error reading avatar file');
    };
    reader.readAsDataURL(file);
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

  // Handle adding a new task
  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    createTask({
      contactId: selectedContactId,
      title: newTaskTitle.trim(),
      dueAt: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null,
    });

    setNewTaskTitle('');
    setNewTaskDueDate('');
    setRefreshKey(k => k + 1);
  };

  // Handle marking task as done
  const handleMarkTaskDone = (taskId: string) => {
    updateTaskStatus(taskId, 'done');
    setRefreshKey(k => k + 1);
  };

  // Handle adding a new interaction
  const handleAddInteraction = () => {
    if (!newInteractionSummary.trim()) return;

    createInteraction({
      contactId: selectedContactId,
      authorContactId: CONTACT_ZERO.id,
      type: newInteractionType,
      summary: newInteractionSummary.trim(),
      occurredAt: newInteractionOccurredAt || undefined,
    });

    setNewInteractionType('call');
    setNewInteractionSummary('');
    setNewInteractionOccurredAt('');
    setRefreshKey(k => k + 1);
  };

  // Handle edit interaction
  const handleStartEditInteraction = (interaction: Interaction) => {
    setEditingInteractionId(interaction.id);
    // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
    const date = new Date(interaction.occurredAt);
    const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEditInteractionForm({
      type: interaction.type,
      occurredAt: localDateTime,
      summary: interaction.summary,
    });
  };

  const handleCancelEditInteraction = () => {
    setEditingInteractionId(null);
    setEditInteractionForm(null);
  };

  const handleSaveEditInteraction = () => {
    if (!editingInteractionId || !editInteractionForm) return;

    const interaction = getInteractionsByContactId(selectedContactId).find(i => i.id === editingInteractionId);
    if (!interaction) return;

    const updatedInteraction: Interaction = {
      ...interaction,
      type: editInteractionForm.type,
      occurredAt: new Date(editInteractionForm.occurredAt).toISOString(),
      summary: editInteractionForm.summary.trim(),
    };

    updateInteraction(updatedInteraction);
    setEditingInteractionId(null);
    setEditInteractionForm(null);
    setRefreshKey(k => k + 1);
  };

  const handleDeleteInteraction = (interactionId: string) => {
    const confirmed = window.confirm('Delete this interaction? This cannot be undone.');
    if (!confirmed) return;

    deleteInteraction(interactionId);
    setRefreshKey(k => k + 1);
  };

  // Handle attachment file upload
  const handleAttachmentFileChange = (interactionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          addAttachmentToInteraction(interactionId, {
            interactionId,
            fileName: file.name,
            mimeType: file.type,
            dataUrl,
          });
          setRefreshKey(k => k + 1);
        }
      };
      reader.onerror = () => {
        console.error('Error reading attachment file');
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    event.target.value = '';
  };

  const handleRemoveAttachment = (interactionId: string, attachmentId: string) => {
    removeAttachmentFromInteraction(interactionId, attachmentId);
    setRefreshKey(k => k + 1);
  };

  const handleOpenAttachment = (attachment: InteractionAttachment) => {
    window.open(attachment.dataUrl, '_blank');
  };

  // Get attachment icon based on mimeType
  const getAttachmentIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image size={12} className="text-blue-400" />;
    }
    if (mimeType === 'application/pdf') {
      return <File size={12} className="text-red-400" />;
    }
    return <Paperclip size={12} className="text-gray-400" />;
  };

  // Navigate to a contact's dossier
  const handleNavigateToContact = (contactId: string) => {
    if (setSelectedContactId) {
      setSelectedContactId(contactId);
    }
    if (onNavigateToDossier) {
      onNavigateToDossier();
    }
  };

  // Navigate to a topic view
  const handleTopicClick = (topic: Topic) => {
    if (onNavigateToTopic) {
      onNavigateToTopic(topic.id);
    }
  };

  // --- HELPER COMPONENTS ---

  const TrendIcon: React.FC<{ trend: 'up' | 'down' | 'flat' }> = ({ trend }) => {
    if (trend === 'up') return <TrendingUp size={16} className="text-green-500" />;
    if (trend === 'down') return <TrendingDown size={16} className="text-red-500" />;
    return <Minus size={16} className="text-gray-500" />;
  };

  const TopicChip: React.FC<{ topic: Topic }> = ({ topic }) => (
    <button
      onClick={() => handleTopicClick(topic)}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 hover:text-purple-300 transition-colors"
    >
      <Hash size={10} />
      {topic.label}
    </button>
  );

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

  const truncate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '…';
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDueDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getInteractionTypeLabel = (type: InteractionType): string => {
    const labels: Record<InteractionType, string> = {
      call: 'Call',
      meeting: 'Meeting',
      message: 'Message',
      email: 'Email',
      dm: 'DM',
      other: 'Other',
    };
    return labels[type];
  };

  const getInteractionTypeIcon = (type: InteractionType) => {
    const iconClass = "text-gray-400";
    switch (type) {
      case 'call':
        return <PhoneCall size={14} className={iconClass} />;
      case 'meeting':
        return <Users size={14} className={iconClass} />;
      case 'message':
        return <MessageSquare size={14} className={iconClass} />;
      case 'email':
        return <Mail size={14} className={iconClass} />;
      case 'dm':
        return <AtSign size={14} className={iconClass} />;
      default:
        return <Activity size={14} className={iconClass} />;
    }
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
          {isArchived && (
            <span className="text-[10px] bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded border border-gray-500/30 font-bold uppercase">
              Archived
            </span>
          )}
          {isEditing && (
            <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded border border-orange-500/30 font-bold uppercase animate-pulse">
              Editing…
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={handleEdit}
              disabled={isArchived}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1D] border border-[#333] hover:border-[#4433FF] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded transition-colors"
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
                src={isEditing 
                  ? (formState.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`)
                  : (contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`)
                }
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

          <div className="space-y-3 border-t border-[#2A2A2A] pt-4">
            {isEditing ? (
              <>
                <div>
                  <label className={labelClass}>Avatar</label>
                  <div className="flex items-center gap-4">
                    {/* Preview */}
                    <div className="flex-shrink-0">
                      <img
                        src={formState.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                        alt="Avatar preview"
                        className="w-16 h-16 rounded-full border-2 border-[#333] object-cover"
                      />
                    </div>
                    {/* File Input */}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileChange}
                        className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#4433FF] file:text-white hover:file:bg-[#5544FF] file:cursor-pointer cursor-pointer"
                      />
                      <p className="text-[10px] text-gray-600 mt-1">Upload an image file (max 2MB recommended)</p>
                    </div>
                  </div>
                </div>
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
                <div>
                  <label className={labelClass}>Company</label>
                  <input
                    type="text"
                    value={formState.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className={inputClass}
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className={labelClass}>Title</label>
                  <input
                    type="text"
                    value={formState.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className={inputClass}
                    placeholder="Job title"
                  />
                </div>
                <div>
                  <label className={labelClass}>Location</label>
                  <input
                    type="text"
                    value={formState.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className={inputClass}
                    placeholder="City, State"
                  />
                </div>
                <div>
                  <label className={labelClass}>LinkedIn URL</label>
                  <input
                    type="url"
                    value={formState.linkedinUrl}
                    onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
                    className={inputClass}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div>
                  <label className={labelClass}>X / Twitter Handle</label>
                  <input
                    type="text"
                    value={formState.xHandle}
                    onChange={(e) => handleInputChange('xHandle', e.target.value)}
                    className={inputClass}
                    placeholder="@username"
                  />
                </div>
              </>
            ) : (
              <>
                {(contact.title || contact.company) && (
                  <div className="text-xs text-gray-400 mb-2">
                    {contact.title && contact.company ? `${contact.title} at ${contact.company}` : contact.title || contact.company}
                  </div>
                )}
                {contact.location && (
                  <div className="text-xs text-gray-500 mb-2">{contact.location}</div>
                )}
                {(contact.linkedinUrl || contact.xHandle) && (
                  <div className="flex items-center justify-center gap-3 mt-2 mb-2">
                    {contact.linkedinUrl && (
                      <a
                        href={contact.linkedinUrl.startsWith('http') ? contact.linkedinUrl : `https://${contact.linkedinUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#4433FF] hover:text-white text-xs flex items-center gap-1"
                      >
                        <User size={12} /> LinkedIn
                      </a>
                    )}
                    {contact.xHandle && (
                      <a
                        href={`https://x.com/${contact.xHandle.replace(/^@/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#4433FF] hover:text-white text-xs flex items-center gap-1"
                      >
                        <AtSign size={12} /> X
                      </a>
                    )}
                  </div>
                )}
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

        {/* CENTER: Frame Metrics + Topics + Timeline */}
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

          {/* Topics */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Hash size={16} className="text-purple-500" />
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {isContactZero ? 'Topics in Your Notes' : 'Topics with this Contact'}
              </h3>
            </div>
            {topicsForContact.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {topicsForContact.map((topic) => (
                  <TopicChip key={topic.id} topic={topic} />
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm italic">No topics linked yet</p>
            )}
          </div>

          {/* Pipeline Status */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Layout size={16} className="text-blue-500" />
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Pipeline
              </h3>
            </div>
            {pipelineItems.length > 0 ? (
              <div className="space-y-3">
                {pipelineItems.map((item) => {
                  const template = getPipelineTemplateById(item.templateId);
                  if (!template) return null;

                  const currentStage = template.stages.find(s => s.id === item.currentStageId);
                  if (!currentStage) return null;

                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-[#1A1A1D] border border-[#333] rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-sm font-bold text-white">{template.name}</div>
                          {item.label && (
                            <div className="text-xs text-gray-400">{item.label}</div>
                          )}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                          item.status === 'won'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : item.status === 'lost'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : item.status === 'archived'
                                ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentStage.color && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: currentStage.color }}
                          />
                        )}
                        <span className="text-xs text-gray-300">{currentStage.name}</span>
                        <span className="text-[10px] text-gray-600 ml-auto">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {item.closedAt && (
                        <div className="text-[10px] text-gray-600 mt-1">
                          Closed: {new Date(item.closedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600 text-sm italic mb-2">Not in any pipeline yet</p>
                <button
                  onClick={() => {
                    // Simple: could navigate to Pipelines view, but keeping minimal for now
                    // This could be enhanced to open Pipelines view with contact pre-selected
                  }}
                  className="text-xs text-[#4433FF] hover:text-white transition-colors"
                >
                  Add to pipeline →
                </button>
              </div>
            )}
          </div>

          {/* Timeline (Interactions + Notes) */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-green-500" />
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Timeline</h3>
              <span className="text-[10px] text-gray-600 ml-auto">{timelineItems.length} entries</span>
            </div>

            {/* Add Interaction Form */}
            <div className="mb-4 space-y-2 p-3 bg-[#1A1A1D] rounded border border-[#333]">
              <div className="flex gap-2">
                <select
                  value={newInteractionType}
                  onChange={(e) => setNewInteractionType(e.target.value as InteractionType)}
                  className="flex-1 bg-[#0E0E0E] border border-[#333] rounded px-2 py-1.5 text-white text-xs focus:border-[#4433FF] outline-none"
                >
                  <option value="call">Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="message">Message</option>
                  <option value="email">Email</option>
                  <option value="dm">DM</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="datetime-local"
                  value={newInteractionOccurredAt}
                  onChange={(e) => setNewInteractionOccurredAt(e.target.value)}
                  className="bg-[#0E0E0E] border border-[#333] rounded px-2 py-1.5 text-white text-xs focus:border-[#4433FF] outline-none"
                />
              </div>
              <textarea
                value={newInteractionSummary}
                onChange={(e) => setNewInteractionSummary(e.target.value)}
                placeholder="Summary..."
                className="w-full bg-[#0E0E0E] border border-[#333] rounded px-2 py-1.5 text-white text-xs resize-none focus:border-[#4433FF] outline-none"
                rows={2}
              />
              <button
                onClick={handleAddInteraction}
                disabled={!newInteractionSummary.trim()}
                className="w-full px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-[#333] disabled:cursor-not-allowed text-white text-xs font-bold rounded transition-colors"
              >
                Log Interaction
              </button>
            </div>

            {/* Timeline Items */}
            {timelineItems.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {timelineItems.map((item) => {
                  const isEditing = item.type === 'interaction' && editingInteractionId === item.id;
                  const interaction = item.interaction;

                  return (
                    <div key={item.id} className="border-l-2 border-[#4433FF]/30 pl-3 py-2">
                      {isEditing && editInteractionForm ? (
                        // Edit mode for interaction
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {item.interactionType && (
                                <div className="flex items-center gap-1">
                                  {getInteractionTypeIcon(item.interactionType)}
                                  <span className="text-[10px] text-gray-500 uppercase font-bold">
                                    {getInteractionTypeLabel(item.interactionType)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={handleCancelEditInteraction}
                                className="p-1 text-gray-400 hover:text-white"
                                title="Cancel"
                              >
                                <X size={12} />
                              </button>
                              <button
                                onClick={handleSaveEditInteraction}
                                className="p-1 text-green-400 hover:text-green-300"
                                title="Save"
                              >
                                <Save size={12} />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <select
                              value={editInteractionForm.type}
                              onChange={(e) => setEditInteractionForm(prev => prev ? { ...prev, type: e.target.value as InteractionType } : null)}
                              className="w-full bg-[#1A1A1D] border border-[#333] rounded px-2 py-1 text-white text-xs focus:border-[#4433FF] outline-none"
                            >
                              <option value="call">Call</option>
                              <option value="meeting">Meeting</option>
                              <option value="message">Message</option>
                              <option value="email">Email</option>
                              <option value="dm">DM</option>
                              <option value="other">Other</option>
                            </select>
                            <input
                              type="datetime-local"
                              value={editInteractionForm.occurredAt}
                              onChange={(e) => setEditInteractionForm(prev => prev ? { ...prev, occurredAt: e.target.value } : null)}
                              className="w-full bg-[#1A1A1D] border border-[#333] rounded px-2 py-1 text-white text-xs focus:border-[#4433FF] outline-none"
                            />
                            <textarea
                              value={editInteractionForm.summary}
                              onChange={(e) => setEditInteractionForm(prev => prev ? { ...prev, summary: e.target.value } : null)}
                              className="w-full bg-[#1A1A1D] border border-[#333] rounded px-2 py-1 text-white text-xs focus:border-[#4433FF] outline-none resize-none"
                              rows={3}
                            />
                            {/* File upload for attachments */}
                            <div>
                              <label className="text-[10px] text-gray-500 mb-1 block">Attachments</label>
                              <input
                                type="file"
                                multiple
                                accept="image/*,application/pdf"
                                onChange={(e) => handleAttachmentFileChange(item.id, e)}
                                className="w-full bg-[#1A1A1D] border border-[#333] rounded px-2 py-1 text-white text-xs focus:border-[#4433FF] outline-none file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-[#4433FF] file:text-white hover:file:bg-[#5544FF] file:cursor-pointer cursor-pointer"
                              />
                            </div>
                            {/* Existing attachments */}
                            {interaction?.attachments && interaction.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {interaction.attachments.map((attachment) => (
                                  <div
                                    key={attachment.id}
                                    className="flex items-center gap-1 px-2 py-1 bg-[#1A1A1D] border border-[#333] rounded text-xs"
                                  >
                                    {getAttachmentIcon(attachment.mimeType)}
                                    <button
                                      onClick={() => handleOpenAttachment(attachment)}
                                      className="text-[#4433FF] hover:text-white transition-colors"
                                    >
                                      {attachment.fileName}
                                    </button>
                                    <button
                                      onClick={() => handleRemoveAttachment(item.id, attachment.id)}
                                      className="text-gray-500 hover:text-red-400 transition-colors ml-1"
                                      title="Remove attachment"
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {item.type === 'interaction' && item.interactionType && (
                                <div className="flex items-center gap-1">
                                  {getInteractionTypeIcon(item.interactionType)}
                                  <span className="text-[10px] text-gray-500 uppercase font-bold">
                                    {getInteractionTypeLabel(item.interactionType)}
                                  </span>
                                </div>
                              )}
                              {item.type === 'note' && (
                                <div className="flex items-center gap-1">
                                  <FileText size={12} className="text-gray-400" />
                                  <span className="text-[10px] text-gray-500 uppercase font-bold">Note</span>
                                </div>
                              )}
                              <span className="text-[10px] text-gray-600">
                                {formatDateTime(item.occurredAt)}
                              </span>
                            </div>
                            {item.type === 'interaction' && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => interaction && handleStartEditInteraction(interaction)}
                                  className="p-1 text-gray-400 hover:text-[#4433FF] transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => handleDeleteInteraction(item.id)}
                                  className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-300 leading-relaxed mb-2">{item.summary}</p>
                          {/* Attachments in view mode */}
                          {interaction?.attachments && interaction.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {interaction.attachments.map((attachment) => (
                                <button
                                  key={attachment.id}
                                  onClick={() => handleOpenAttachment(attachment)}
                                  className="flex items-center gap-1 px-2 py-1 bg-[#1A1A1D] border border-[#333] rounded text-xs hover:border-[#4433FF] transition-colors"
                                >
                                  {getAttachmentIcon(attachment.mimeType)}
                                  <span className="text-[#4433FF] hover:text-white">{attachment.fileName}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-600 text-sm italic">No timeline entries yet</p>
            )}
          </div>

          {/* Timeline Stats (Last Contact, Next Action, Last Scan) */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-green-500" />
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Key Dates</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Last Contact</span>
                <span className="text-sm text-white font-mono">
                  {contact.lastContactAt ? formatDate(contact.lastContactAt) : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Next Action</span>
                <span className={`text-sm font-mono ${contact.nextActionAt ? 'text-[#4433FF]' : 'text-gray-600'}`}>
                  {contact.nextActionAt ? formatDate(contact.nextActionAt) : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Last Scan</span>
                <span className="text-sm text-white font-mono">
                  {contact.frame.lastScanAt ? formatDate(contact.frame.lastScanAt) : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Notes + Tasks + Tags */}
        <div className="space-y-6">
          {/* Tasks Section */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckSquare size={16} className="text-cyan-500" />
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Tasks {!isContactZero && 'For'}
              </h3>
              <span className="text-[10px] text-gray-600 ml-auto">{openTasks.length} open</span>
            </div>

            {/* Add Task Form */}
            <div className="mb-4 space-y-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="New task..."
                className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="flex-1 bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
                />
                <button
                  onClick={handleAddTask}
                  disabled={!newTaskTitle.trim()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-[#333] disabled:cursor-not-allowed text-white text-xs font-bold rounded transition-colors flex items-center gap-1"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>

            {/* Open Tasks List */}
            {openTasks.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {openTasks.map((task) => (
                  <div 
                    key={task.id}
                    className="flex items-start gap-3 p-2 bg-[#1A1A1D] rounded border border-[#333] hover:border-cyan-500/30 transition-colors"
                  >
                    <button
                      onClick={() => handleMarkTaskDone(task.id)}
                      className="mt-0.5 text-gray-500 hover:text-cyan-500 transition-colors"
                      title="Mark as done"
                    >
                      <Square size={16} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{task.title}</p>
                      {task.dueAt && (
                        <p className="text-[10px] text-cyan-400 mt-1">
                          Due: {formatDueDate(task.dueAt)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm italic">No open tasks</p>
            )}
          </div>

          {/* Notes Section */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-[#4433FF]" />
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Notes {!isContactZero && 'About'}
              </h3>
              <span className="text-[10px] text-gray-600 ml-auto">{notesAboutContact.length} total</span>
            </div>

            <div className="mb-4">
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                onKeyDown={handleNoteKeyDown}
                placeholder={`Add a note...`}
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

            {notesAboutContact.length > 0 ? (
              <div className="space-y-3 max-h-[150px] overflow-y-auto">
                {notesAboutContact.slice(0, 3).map((note) => (
                  <div key={note.id} className="border-l-2 border-[#4433FF]/30 pl-3 py-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={10} className="text-gray-600" />
                      <span className="text-[10px] text-gray-500">{formatDate(note.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-400">{truncate(note.content, 80)}</p>
                  </div>
                ))}
                {notesAboutContact.length > 3 && (
                  <p className="text-xs text-gray-600 pl-3">+{notesAboutContact.length - 3} more</p>
                )}
              </div>
            ) : (
              <p className="text-gray-600 text-sm italic">No notes yet</p>
            )}
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
              </div>
            ) : contact.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {contact.tags.map((tag) => (
                  <span key={tag} className="text-xs px-3 py-1 rounded-full bg-[#4433FF]/20 text-[#737AFF] border border-[#4433FF]/30">
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm italic">No tags set</p>
            )}
          </div>
        </div>
      </div>

      {/* CONTACT ZERO ONLY: Your Open Tasks (what you owe to others) */}
      {isContactZero && openTasksByContact.size > 0 && (
        <div className="bg-[#0E0E0E] border border-cyan-500/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <AlertCircle size={16} className="text-cyan-500" />
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Your Open Tasks (Owed to Others)
            </h3>
            <span className="text-[10px] text-gray-600 ml-auto">
              {Array.from(openTasksByContact.values()).flat().length} tasks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(openTasksByContact.entries()).map(([contactId, tasks]) => {
              const targetContact = getContactById(contactId);
              if (!targetContact) return null;

              return (
                <button
                  key={contactId}
                  onClick={() => handleNavigateToContact(contactId)}
                  className="flex items-center gap-3 p-4 bg-[#1A1A1D] border border-[#333] rounded-lg hover:border-cyan-500/50 transition-colors text-left"
                >
                  <img 
                    src={targetContact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetContact.id}`}
                    alt={targetContact.fullName}
                    className="w-10 h-10 rounded-full border border-[#333]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white flex items-center gap-1">
                      {targetContact.fullName}
                      <ArrowRight size={12} className="text-cyan-500" />
                    </div>
                    <div className="text-xs text-cyan-400">{tasks.length} open task{tasks.length !== 1 ? 's' : ''}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTACT ZERO ONLY: Today & Upcoming (next 7 days) */}
      {isContactZero && upcomingDates.length > 0 && (
        <div className="bg-[#0E0E0E] border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calendar size={16} className="text-green-500" />
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Today & Upcoming (7 Days)
            </h3>
            <span className="text-[10px] text-gray-600 ml-auto">
              {Object.values(upcomingTasksByDate).flat().length} tasks
            </span>
          </div>

          <div className="space-y-4">
            {upcomingDates.map((dateKey) => {
              const dayTasks = upcomingTasksByDate[dateKey];
              if (!dayTasks || dayTasks.length === 0) return null;

              return (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`text-xs font-bold ${dateKey === todayKey ? 'text-green-400' : 'text-gray-400'}`}>
                      {formatUpcomingDateHeader(dateKey)}
                    </div>
                    <div className="flex-1 h-px bg-[#2A2A2A]" />
                    <span className="text-[10px] text-gray-600">{dayTasks.length}</span>
                  </div>

                  {/* Tasks for this day */}
                  <div className="space-y-2 pl-2">
                    {dayTasks.map((task) => {
                      const taskContact = getContactById(task.contactId);
                      if (!taskContact) return null;
                      const timeStr = formatDueTime(task.dueAt);

                      return (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-2 bg-[#1A1A1D] rounded border border-[#333]"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {timeStr && (
                                <span className="text-[10px] text-green-400 flex items-center gap-1">
                                  <Clock size={10} />
                                  {timeStr}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-white truncate">{task.title}</p>
                            <button
                              onClick={() => handleNavigateToContact(taskContact.id)}
                              className="flex items-center gap-1 mt-1 text-xs text-[#4433FF] hover:text-white transition-colors"
                            >
                              <img
                                src={taskContact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${taskContact.id}`}
                                alt={taskContact.fullName}
                                className="w-4 h-4 rounded-full border border-[#333]"
                              />
                              {taskContact.fullName}
                              <ArrowRight size={10} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTACT ZERO ONLY: Your Topics */}
      {isContactZero && topicsForAuthor.length > 0 && (
        <div className="bg-[#0E0E0E] border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Hash size={16} className="text-purple-500" />
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Your Topics (All Notes)
            </h3>
            <span className="text-[10px] text-gray-600 ml-auto">{topicsForAuthor.length} topics</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {topicsForAuthor.map((topic) => (
              <TopicChip key={topic.id} topic={topic} />
            ))}
          </div>
        </div>
      )}

      {/* CONTACT ZERO ONLY: Your Last Interactions */}
      {isContactZero && lastInteractions.length > 0 && (
        <div className="bg-[#0E0E0E] border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <PhoneCall size={16} className="text-blue-500" />
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Your Last Interactions
            </h3>
            <span className="text-[10px] text-gray-600 ml-auto">{lastInteractions.length} entries</span>
          </div>

          <div className="space-y-3">
            {lastInteractions.map((interaction) => {
              const targetContact = getContactById(interaction.contactId);
              if (!targetContact) return null;

              return (
                <div
                  key={interaction.id}
                  className="flex items-start gap-3 p-3 bg-[#1A1A1D] border border-[#333] rounded-lg hover:border-blue-500/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mt-0.5">
                    {getInteractionTypeIcon(interaction.type)}
                    <span className="text-[10px] text-gray-500 uppercase font-bold">
                      {getInteractionTypeLabel(interaction.type)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => handleNavigateToContact(targetContact.id)}
                        className="text-sm font-bold text-blue-400 hover:text-white transition-colors flex items-center gap-1"
                      >
                        {targetContact.fullName}
                        <ArrowRight size={10} />
                      </button>
                      <span className="text-[10px] text-gray-600">
                        {formatDateTime(interaction.occurredAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed mb-2">
                      {truncate(interaction.summary, 100)}
                    </p>
                    {/* Attachments */}
                    {interaction.attachments && interaction.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {interaction.attachments.map((attachment) => (
                          <button
                            key={attachment.id}
                            onClick={() => handleOpenAttachment(attachment)}
                            className="flex items-center gap-1 px-2 py-1 bg-[#0E0E0E] border border-[#333] rounded text-[10px] hover:border-[#4433FF] transition-colors"
                          >
                            {getAttachmentIcon(attachment.mimeType)}
                            <span className="text-[#4433FF] hover:text-white">{attachment.fileName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTACT ZERO ONLY: Activity Feed */}
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
                <div key={note.id} className="bg-[#1A1A1D] border border-[#333] rounded-lg p-4 hover:border-[#4433FF]/50 transition-colors">
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
                  <p className="text-xs text-gray-400 leading-relaxed">{truncate(note.content, 80)}</p>
                </div>
              );
            })}
          </div>
          {activityNotes.length > 6 && (
            <p className="text-xs text-gray-600 mt-4 text-center">+{activityNotes.length - 6} more</p>
          )}
        </div>
      )}

      {/* BOTTOM: Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare size={12} className="text-gray-600" />
            <span className="text-[9px] font-bold text-gray-500 uppercase">Tasks</span>
          </div>
          <div className="text-2xl font-display font-bold text-cyan-400">{openTasks.length}</div>
          <div className="text-[10px] text-gray-600">open</div>
        </div>

        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={12} className="text-gray-600" />
            <span className="text-[9px] font-bold text-gray-500 uppercase">Notes</span>
          </div>
          <div className="text-2xl font-display font-bold text-white">{notesAboutContact.length}</div>
          <div className="text-[10px] text-gray-600">entries</div>
        </div>

        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Hash size={12} className="text-gray-600" />
            <span className="text-[9px] font-bold text-gray-500 uppercase">Topics</span>
          </div>
          <div className="text-2xl font-display font-bold text-purple-400">{topicsForContact.length}</div>
          <div className="text-[10px] text-gray-600">linked</div>
        </div>

        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={12} className="text-gray-600" />
            <span className="text-[9px] font-bold text-gray-500 uppercase">Frame</span>
          </div>
          <div className={`text-2xl font-display font-bold ${scoreColor}`}>{contact.frame.currentScore}</div>
          <div className="text-[10px] text-gray-600">score</div>
        </div>

        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Tag size={12} className="text-gray-600" />
            <span className="text-[9px] font-bold text-gray-500 uppercase">Tags</span>
          </div>
          <div className="text-2xl font-display font-bold text-white">{contact.tags.length}</div>
          <div className="text-[10px] text-gray-600">labels</div>
        </div>
      </div>
    </div>
  );
};
