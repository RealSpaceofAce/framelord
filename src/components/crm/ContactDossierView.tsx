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

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, TrendingUp, TrendingDown, Minus,
  Activity, Zap, Calendar, FileText, Mail, Phone,
  Tag, Clock, Edit2, Save, X, Send, ArrowRight, User, Hash,
  CheckSquare, Square, Plus, AlertCircle, PhoneCall, Users, MessageSquare, AtSign,
  Trash2, Paperclip, Image, File, Layout, Scan, Music, GripVertical, Eye, EyeOff, Settings2
} from 'lucide-react';
import { getContactById, CONTACT_ZERO, updateContact } from '../../services/contactStore';
import { getNotesByContactId, getNotesByAuthorId, createNote, getNotesWithMention } from '../../services/noteStore';
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
import {
  getGroupsForContact,
  getAllGroups,
  addMember,
} from '../../services/groupStore';
import {
  getProjectsByContact,
} from '../../services/projectStore';
import {
  getWantsByPrimaryContact,
  type Want,
} from '../../services/wantStore';
import { Contact, RelationshipDomain, ContactStatus, Topic, Task, Interaction, InteractionType, InteractionAttachment } from '../../types';
import { DatePicker } from '../DatePicker';
import { 
  getAllAttachmentsForContactZero, 
  getAttachmentsForContact, 
  filterAttachmentsByType, 
  searchAttachments,
  NoteAttachmentWithContext 
} from '../../services/attachmentStore';
import {
  getWidgetLayout,
  saveWidgetLayout,
  toggleWidgetVisibility,
  reorderWidgets,
  resetWidgetLayout,
  WidgetId,
  WidgetConfig,
} from '../../services/widgetLayoutStore';
import { FrameScanContactTab } from './FrameScanContactTab';
import { AIProfileWidget } from './AIProfileWidget';
import { DossierTwoColumnLayout } from './DossierTwoColumnLayout';
import { ContactDetailsCard } from './ContactDetailsCard';
import { getCurrentUserPlan } from '@/config/planConfig';

const MotionDiv = motion.div as any;

// --- HELPERS ---

/**
 * Strips HTML tags from content, returning plain text.
 * Used for note snippets in the dossier view.
 */
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const text = temp.textContent || temp.innerText || '';
  return text.replace(/\s+/g, ' ').trim();
};

// --- PROPS ---

interface ContactDossierViewProps {
  selectedContactId: string;
  setSelectedContactId?: (id: string) => void;
  onNavigateToDossier?: () => void;
  onNavigateToTopic?: (topicId: string) => void;
  onNavigateToGroup?: (groupId: string) => void;
  onNavigateToProject?: (projectId: string) => void;
  onNavigateToFrameScanReport?: (reportId: string) => void;
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
  onNavigateToTopic,
  onNavigateToGroup,
  onNavigateToProject,
  onNavigateToFrameScanReport,
}) => {
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isCustomizingWidgets, setIsCustomizingWidgets] = useState(false);
  const [useGlobalLayout, setUseGlobalLayout] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [layoutMode, setLayoutMode] = useState<'classic' | 'tactical'>('tactical');
  
  // Widget layout
  const widgetLayout = useMemo(() => getWidgetLayout(selectedContactId), [selectedContactId, refreshKey]);
  
  // Helper to check if widget is visible
  const isWidgetVisible = (widgetId: WidgetId): boolean => {
    const widget = widgetLayout.widgets.find(w => w.id === widgetId);
    return widget ? widget.visible : true; // Default to visible if not found
  };
  
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
  
  // Get contact from store (re-fetch on selectedContactId or refreshKey change)
  const contact = useMemo(() => {
    return getContactById(selectedContactId) || CONTACT_ZERO;
  }, [selectedContactId, refreshKey]);
  
  // Form state for editing
  const [formState, setFormState] = useState<EditFormState>({
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

  // Initialize form state when entering edit mode or when contact changes
  useEffect(() => {
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

  const isContactZero = contact.id === CONTACT_ZERO.id;
  const isArchived = contact.status === 'archived';
  
  // Notes ABOUT this contact (targetContactId === contact.id)
  const notesAboutContact = getNotesByContactId(contact.id);

  // Interactions with this contact (for tactical layout timeline)
  const interactions = useMemo(() => {
    return getInteractionsByContactId(contact.id)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [contact.id]);

  // Notes that @MENTION this contact (excludes notes about this contact)
  const notesMentioningContact = useMemo(() => {
    if (isContactZero) return []; // Contact Zero doesn't need @mentions to themselves
    return getNotesWithMention(contact.id).filter(
      note => note.targetContactId !== contact.id // Exclude notes already shown in "Notes About"
    );
  }, [contact.id, isContactZero]);

  // Tasks for this contact
  const openTasks = getOpenTasksByContactId(selectedContactId);
  const allTasks = getTasksByContactId(selectedContactId);

  // Projects for this contact
  const projects = getProjectsByContact(selectedContactId);

  // Wants connected to this contact (where this contact is the primary contact)
  const wantsConnected = getWantsByPrimaryContact(selectedContactId);
  
  // For Contact Zero: notes written BY Contact Zero about OTHER contacts
  const activityNotes = isContactZero 
    ? getNotesByAuthorId(CONTACT_ZERO.id).filter(n => n.contactId !== CONTACT_ZERO.id)
    : [];

  // Topics linked to notes ABOUT this contact
  const topicsForContact = getTopicsForContact(selectedContactId);

  // For Contact Zero: all topics from notes written by them
  const topicsForAuthor = isContactZero ? getTopicsForAuthor(CONTACT_ZERO.id) : [];

  // Attachments
  const [attachmentFilter, setAttachmentFilter] = useState<'all' | 'image' | 'audio' | 'file'>('all');
  const [attachmentSearch, setAttachmentSearch] = useState('');
  const allAttachments = useMemo(() => {
    const attachments = isContactZero 
      ? getAllAttachmentsForContactZero()
      : getAttachmentsForContact(selectedContactId);
    const filtered = filterAttachmentsByType(attachments, attachmentFilter);
    return searchAttachments(filtered, attachmentSearch);
  }, [isContactZero, selectedContactId, attachmentFilter, attachmentSearch]);

  // Pipeline items for this contact
  const pipelineItems = getPipelineItemsByContact(selectedContactId);

  // Groups for this contact
  const contactGroups = getGroupsForContact(selectedContactId);
  const [newGroupId, setNewGroupId] = useState<string>('');

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

  const engagementSeries = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 12 }).map((_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - idx), 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return {
        key,
        label: date.toLocaleDateString('en-US', { month: 'short' }),
        count: 0,
      };
    });

    timelineItems.forEach((item) => {
      const date = new Date(item.occurredAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) {
        bucket.count += 1;
      }
    });

    const max = Math.max(1, ...buckets.map((b) => b.count));
    return buckets.map((bucket) => ({
      label: bucket.label,
      count: bucket.count,
      value: Math.round((bucket.count / max) * 100),
    }));
  }, [timelineItems]);

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
      targetContactId: selectedContactId !== CONTACT_ZERO.id ? selectedContactId : undefined,
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

    Array.from(files).forEach((file: File) => {
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
      archived: 'text-gray-400 bg-gray-500/20 border-gray-500/30',
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
  const glassCard = "bg-[#0c1424]/80 border border-[#1b2c45] rounded-2xl shadow-[0_20px_70px_rgba(0,0,0,0.55),0_0_30px_rgba(20,210,255,0.15)] backdrop-blur";
  const subCard = "bg-[#0a111d]/80 border border-[#112035] rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.5)] backdrop-blur";
  const inputClass = "w-full bg-[#0a1020]/80 border border-[#1a2a3f] rounded-lg px-3 py-2 text-[#e0edff] text-sm focus:border-[#2ee0ff] outline-none placeholder:text-[#5f7ca6] shadow-[0_10px_30px_rgba(0,0,0,0.35)]";
  const selectClass = "w-full bg-[#0a1020]/80 border border-[#1a2a3f] rounded-lg px-3 py-2 text-[#e0edff] text-sm focus:border-[#2ee0ff] outline-none cursor-pointer shadow-[0_10px_30px_rgba(0,0,0,0.35)]";
  const labelClass = "text-[10px] font-semibold text-[#6b92b9] uppercase tracking-[0.18em] mb-1 block";
  const engagementPolylinePoints = engagementSeries.map((point, idx) => {
    const x = engagementSeries.length > 1 ? (idx / (engagementSeries.length - 1)) * 100 : 0;
    const y = 100 - point.value * 0.9;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative min-h-screen text-[#dce8ff]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,209,0.08),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(68,140,255,0.12),transparent_28%),linear-gradient(140deg,#050810_0%,#060b17_45%,#04060d_100%)]" />
      <div className="relative space-y-8 pb-20 px-4 lg:px-8">
        {/* HEADER */}
        <div className={`${glassCard} px-5 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl border border-[#1f2f45] bg-[radial-gradient(circle_at_30%_30%,rgba(31,226,255,0.6),rgba(31,226,255,0)),#0b1728] shadow-[0_0_24px_rgba(31,226,255,0.25)] flex items-center justify-center">
              <User className="text-[#8beaff]" size={18} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#6b92b9]">Contact dashboard</p>
              <h1 className="text-2xl font-display font-bold text-white leading-tight">
                Contact Dossier
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsCustomizingWidgets(!isCustomizingWidgets);
                  if (isCustomizingWidgets) {
                    // Save layout when exiting customization mode
                    const layout = getWidgetLayout(selectedContactId);
                    layout.isGlobal = useGlobalLayout;
                    if (!useGlobalLayout) {
                      layout.contactId = selectedContactId;
                    }
                    saveWidgetLayout(layout);
                    setRefreshKey(k => k + 1);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
                  isCustomizingWidgets
                    ? 'bg-[#4433FF] text-white'
                    : 'bg-[#1A1A1D] text-gray-400 hover:text-white border border-[#333]'
                }`}
                title="Customize widget layout"
              >
                <Settings2 size={14} />
                {isCustomizingWidgets ? 'Done' : 'Layout'}
              </button>
              {!isContactZero && (
                <button
                  onClick={() => setLayoutMode(layoutMode === 'classic' ? 'tactical' : 'classic')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
                    layoutMode === 'tactical'
                      ? 'bg-[#7a5dff] text-white'
                      : 'bg-[#1A1A1D] text-gray-400 hover:text-white border border-[#333]'
                  }`}
                  title="Switch between classic and tactical view modes"
                >
                  <Layout size={14} />
                  {layoutMode === 'tactical' ? 'Tactical' : 'Classic'}
                </button>
              )}
              {isContactZero && (
                <span className="text-[11px] px-3 py-1 rounded-full border border-[#2ee0ff55] bg-[#0c2c3d]/60 text-[#82f2ff] font-semibold uppercase tracking-[0.15em]">
                  Identity Prime
                </span>
              )}
              {isArchived && (
                <span className="text-[11px] px-3 py-1 rounded-full border border-[#65738a55] bg-[#1b2433]/70 text-[#9fb2c9] font-semibold uppercase tracking-[0.15em]">
                  Archived
                </span>
              )}
              {isEditing && (
                <span className="text-[11px] px-3 py-1 rounded-full border border-[#f6a74c66] bg-[#2b1d10]/80 text-[#f6c68e] font-semibold uppercase tracking-[0.15em] animate-pulse">
                  Editing
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {!isEditing ? (
              <button
                onClick={handleEdit}
                disabled={isArchived}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0e1a2d] border border-[#1f2f45] hover:border-[#2ee0ff] disabled:opacity-50 disabled:cursor-not-allowed text-[#dce8ff] text-xs font-bold transition-colors shadow-[0_0_20px_rgba(0,0,0,0.35)]"
              >
                <Edit2 size={14} /> Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#12192b] border border-[#2b3c55] hover:border-[#ff8a8a] text-[#dce8ff] text-xs font-bold transition-colors shadow-[0_0_20px_rgba(0,0,0,0.35)]"
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#1cf1ff] via-[#28c5ff] to-[#7a5dff] text-[#03101d] text-xs font-bold transition-colors shadow-[0_15px_45px_rgba(24,210,255,0.35)]"
                >
                  <Save size={14} /> Save Changes
                </button>
              </>
            )}
          </div>
        </div>

        {/* Widget Customization Panel */}
        {isCustomizingWidgets && (
          <div className={`${glassCard} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Customize Widget Layout</h3>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-gray-400">
                  <input
                    type="checkbox"
                    checked={useGlobalLayout}
                    onChange={(e) => setUseGlobalLayout(e.target.checked)}
                    className="rounded"
                  />
                  Apply to all contacts
                </label>
                <button
                  onClick={() => {
                    resetWidgetLayout(selectedContactId, useGlobalLayout);
                    setRefreshKey(k => k + 1);
                  }}
                  className="px-3 py-1.5 text-xs bg-[#1A1A1D] border border-[#333] rounded hover:bg-[#2A2A2A] text-gray-400 hover:text-white"
                >
                  Reset to Default
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {widgetLayout.widgets
                .filter(w => {
                  // Filter out Contact Zero only widgets if not Contact Zero
                  if (!isContactZero) {
                    return !['openTasksOwed', 'upcomingTasks', 'topics', 'activityFeed', 'lastInteractions'].includes(w.id);
                  }
                  return true;
                })
                .map((widget, index) => (
                  <div
                    key={widget.id}
                    className="flex items-center gap-3 p-3 bg-[#1A1A1D] border border-[#333] rounded-lg"
                  >
                    <GripVertical size={16} className="text-gray-500 cursor-move" />
                    <button
                      onClick={() => {
                        toggleWidgetVisibility(selectedContactId, widget.id, useGlobalLayout);
                        setRefreshKey(k => k + 1);
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      {widget.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <span className="flex-1 text-sm text-white capitalize">
                      {widget.id.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          if (index > 0) {
                            const newOrder = [...widgetLayout.widgets.map(w => w.id)];
                            [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                            reorderWidgets(selectedContactId, newOrder, useGlobalLayout);
                            setRefreshKey(k => k + 1);
                          }
                        }}
                        disabled={index === 0}
                        className="px-2 py-1 text-xs bg-[#0E0E0E] border border-[#333] rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#2A2A2A]"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => {
                          if (index < widgetLayout.widgets.length - 1) {
                            const newOrder = [...widgetLayout.widgets.map(w => w.id)];
                            [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                            reorderWidgets(selectedContactId, newOrder, useGlobalLayout);
                            setRefreshKey(k => k + 1);
                          }
                        }}
                        disabled={index === widgetLayout.widgets.length - 1}
                        className="px-2 py-1 text-xs bg-[#0E0E0E] border border-[#333] rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#2A2A2A]"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TACTICAL TWO-COLUMN LAYOUT (for non-Contact Zero) */}
        {!isContactZero && layoutMode === 'tactical' ? (
          <DossierTwoColumnLayout
            contactId={selectedContactId}
            plan={getCurrentUserPlan()}
            renderTimeline={() => (
              <div className="p-4 space-y-3">
                {interactions.length > 0 ? (
                  interactions.slice(0, 10).map((interaction) => (
                    <div
                      key={interaction.id}
                      className="flex items-start gap-3 p-3 bg-[#0a111d] border border-[#112035] rounded-lg"
                    >
                      <div className="mt-0.5">{getInteractionTypeIcon(interaction.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] text-gray-500 uppercase font-bold">
                            {getInteractionTypeLabel(interaction.type)}
                          </span>
                          <span className="text-[10px] text-gray-600">
                            {formatDateTime(interaction.occurredAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">{interaction.summary}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">No interactions logged yet</p>
                )}
              </div>
            )}
            renderNotes={() => (
              <div className="p-4 space-y-3">
                {/* Add Note Form */}
                <div className="mb-4">
                  <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    onKeyDown={handleNoteKeyDown}
                    placeholder="Add a note..."
                    className="w-full bg-[#0a111d] border border-[#112035] rounded-lg p-3 text-gray-200 text-sm resize-none focus:border-[#4433FF] outline-none"
                    rows={2}
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!newNoteContent.trim()}
                    className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#4433FF] hover:bg-[#5544FF] disabled:bg-[#1b2c45] disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    <Send size={12} /> Add Note
                  </button>
                </div>
                {notesAboutContact.length > 0 ? (
                  notesAboutContact.map((note) => (
                    <div key={note.id} className="p-3 bg-[#0a111d] border border-[#112035] rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock size={10} className="text-gray-500" />
                        <span className="text-[10px] text-gray-500">{formatDate(note.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-300">{truncate(stripHtmlTags(note.content), 200)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">No notes yet</p>
                )}
              </div>
            )}
            renderTasks={() => (
              <div className="p-4 space-y-3">
                {/* Add Task Form */}
                <div className="mb-4 space-y-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="New task..."
                    className="w-full bg-[#0a111d] border border-[#112035] rounded-lg px-3 py-2 text-gray-200 text-sm focus:border-[#4433FF] outline-none"
                  />
                  <div className="flex gap-2">
                    <DatePicker
                      value={newTaskDueDate}
                      onChange={setNewTaskDueDate}
                      placeholder="Due date..."
                      className="flex-1"
                    />
                    <button
                      onClick={handleAddTask}
                      disabled={!newTaskTitle.trim()}
                      className="px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] disabled:bg-[#1b2c45] disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                </div>
                {openTasks.length > 0 ? (
                  openTasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-3 p-3 bg-[#0a111d] border border-[#112035] rounded-lg">
                      <button
                        onClick={() => handleMarkTaskDone(task.id)}
                        className="mt-0.5 text-gray-500 hover:text-[#4433FF] transition-colors"
                      >
                        <Square size={16} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{task.title}</p>
                        {task.dueAt && (
                          <p className="text-[10px] text-gray-500 mt-1">
                            Due: {formatDueDate(task.dueAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">No open tasks</p>
                )}
              </div>
            )}
            renderFrameScan={() => (
              <FrameScanContactTab
                contactId={selectedContactId}
                contactName={contact.fullName}
              />
            )}
            onCreateTask={(title) => {
              setNewTaskTitle(title);
            }}
            onLogInteraction={() => {
              // Refresh data after interaction logged
              setRefreshKey(k => k + 1);
            }}
            onRefresh={() => {
              // Refresh all data
              setRefreshKey(k => k + 1);
            }}
            onNavigateToDossier={(contactId) => {
              if (setSelectedContactId) {
                setSelectedContactId(contactId);
              }
            }}
          />
        ) : (
        <>
        {/* MAIN GRID - 4 Zone Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr_360px] gap-6 items-start">

        {/* ZONE 1: WHO IS THIS - Left sidebar identity */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1 mb-2">
            <User size={14} className="text-[#8beaff]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b92b9]">Zone 1 — Who is this</span>
          </div>
        <div className={`${glassCard} p-6 relative overflow-hidden ${isContactZero ? 'border-[#2ee0ff66]' : ''}`}>
          <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_30%_20%,rgba(31,226,255,0.18),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(122,93,255,0.18),transparent_35%)]" />
          <div className="relative flex flex-col items-center text-center mb-6 gap-2">
            <div className="relative mb-3">
              <div className="absolute inset-[-10px] rounded-full bg-[conic-gradient(from_120deg,#1cf1ff,#7a5dff,#1cf1ff)] opacity-50 blur-sm" />
              <div className="absolute inset-[-14px] rounded-full bg-[#1cf1ff22] blur-2xl" />
              <img 
                src={isEditing 
                  ? (formState.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`)
                  : (contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`)
                }
                alt={contact.fullName}
                className="relative w-28 h-28 rounded-full border-4 border-[#0a111d] shadow-[0_10px_45px_rgba(0,0,0,0.55),0_0_25px_rgba(31,226,255,0.35)] object-cover"
              />
              {contact.status === 'active' && !isEditing && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-[#1cf1ff] to-[#7a5dff] border-2 border-[#0c1424] flex items-center justify-center shadow-[0_0_18px_rgba(28,241,255,0.5)]">
                  <Zap size={12} className="text-[#04101d]" />
                </div>
              )}
            </div>
            
            {isEditing ? (
              <div className="w-full mb-2">
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
              <div className="w-full mb-2">
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
              <p className="text-[13px] text-[#8fb0d4] mt-1 font-medium">
                {contact.relationshipRole}
              </p>
            )}

            {isEditing ? (
              <div className="w-full grid grid-cols-2 gap-3 mt-2">
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
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <span className={`text-[11px] px-3 py-1 rounded-full uppercase font-semibold border border-[#1f2f45] bg-[#0e1a2d] text-[#9cc8ff] shadow-[0_0_16px_rgba(0,0,0,0.35)]`}>
                  {contact.relationshipDomain}
                </span>
                <span className={`text-[11px] px-3 py-1 rounded-full uppercase font-semibold border ${statusColor(contact.status)} shadow-[0_0_16px_rgba(0,0,0,0.35)]`}>
                  {contact.status}
                </span>
              </div>
            )}
          </div>

          <div className="relative space-y-3 border-t border-[#16253a] pt-4">
            {isEditing ? (
              <>
                <div>
                  <label className={labelClass}>Avatar</label>
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <img
                        src={formState.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                        alt="Avatar preview"
                        className="w-16 h-16 rounded-full border-2 border-[#1a2a3f] object-cover shadow-[0_8px_25px_rgba(0,0,0,0.35)]"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileChange}
                        className="w-full bg-[#0a1020]/80 border border-[#1a2a3f] rounded-lg px-3 py-2 text-[#e0edff] text-sm focus:border-[#2ee0ff] outline-none file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gradient-to-r from-[#1cf1ff] to-[#7a5dff] file:text-[#04101f] hover:file:opacity-90 cursor-pointer"
                      />
                      <p className="text-[10px] text-[#6b92b9] mt-1">Upload an image file (max 2MB recommended)</p>
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
                  <div className="text-sm text-[#8fb0d4] mb-1">
                    {contact.title && contact.company ? `${contact.title} at ${contact.company}` : contact.title || contact.company}
                  </div>
                )}
                {contact.location && (
                  <div className="text-xs text-[#6b92b9] mb-2">{contact.location}</div>
                )}
                {(contact.linkedinUrl || contact.xHandle) && (
                  <div className="flex items-center justify-center gap-3 mt-2 mb-3">
                    {contact.linkedinUrl && (
                      <a
                        href={contact.linkedinUrl.startsWith('http') ? contact.linkedinUrl : `https://${contact.linkedinUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#8beaff] hover:text-white text-xs flex items-center gap-1"
                      >
                        <User size={12} /> LinkedIn
                      </a>
                    )}
                    {contact.xHandle && (
                      <a
                        href={`https://x.com/${contact.xHandle.replace(/^@/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#8beaff] hover:text-white text-xs flex items-center gap-1"
                      >
                        <AtSign size={12} /> X
                      </a>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center text-sm bg-[#0d1627]/80 border border-[#1a2a3f] rounded-lg px-3 py-2">
                  <span className="text-[#7fa6d1] flex items-center gap-2">
                    <Mail size={12} /> Email
                  </span>
                  <span className="text-white font-mono text-xs">{contact.email || '—'}</span>
                </div>
                <div className="flex justify-between items-center text-sm bg-[#0d1627]/80 border border-[#1a2a3f] rounded-lg px-3 py-2">
                  <span className="text-[#7fa6d1] flex items-center gap-2">
                    <Phone size={12} /> Phone
                  </span>
                  <span className="text-white font-mono text-xs">{contact.phone || '—'}</span>
                </div>
                <button className="w-full mt-3 px-4 py-3 bg-gradient-to-r from-[#00f0ff] via-[#2bc8ff] to-[#7c5dff] text-[#03101d] text-sm font-bold rounded-xl shadow-[0_12px_40px_rgba(24,210,255,0.35)] hover:opacity-95 transition">
                  Run Frame Scan
                </button>
              </>
            )}
          </div>
        </div>

        {/* Contact Details Card */}
        <ContactDetailsCard
          contactId={selectedContactId}
          onExpandClick={() => setIsEditing(true)}
          onRefresh={() => setRefreshKey(k => k + 1)}
        />
        </div>
        {/* End Zone 1 */}

        {/* ZONE 2 & 3: PROFILE + WHAT'S GOING ON - Center column */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-1 mb-2">
            <Activity size={14} className="text-[#c49bff]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b92b9]">Zone 2 & 3 — Profile & Activity</span>
          </div>
          {/* Frame Score */}
          <MotionDiv 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`${glassCard} p-6 relative overflow-hidden`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(28,241,255,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(122,93,255,0.08),transparent_40%)]" />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-[#8beaff]" />
                  <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">Frame Score</h3>
                </div>
                <p className="text-sm text-[#7fa6d1] mt-1">Engagement & relationship strength</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#8beaff] bg-[#0e1a2d] border border-[#1f2f45] px-3 py-1 rounded-full">
                <Clock size={12} />
                {contact.frame.lastScanAt ? `Updated ${formatDate(contact.frame.lastScanAt)}` : 'Never scanned'}
              </div>
            </div>
            <div className="relative flex items-center justify-center py-6">
              <div className="relative w-44 h-44">
                <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_120deg,#1cf1ff,#7a5dff,#1cf1ff)] opacity-50 blur-sm" />
                <div className="absolute inset-0 rounded-full border border-[#1df2ff55] shadow-[0_0_32px_rgba(29,242,255,0.25)]" />
                <div className="absolute inset-4 rounded-full bg-[#0b1220] border border-[#1b2d45] shadow-inner" />
                <div className="absolute inset-8 rounded-full bg-[radial-gradient(circle,rgba(12,20,36,0.8),rgba(8,12,22,0.9))] flex flex-col items-center justify-center gap-1">
                  <span className={`text-6xl font-display font-bold ${scoreColor}`}>
                    {contact.frame.currentScore}
                  </span>
                  <span className="text-[12px] uppercase tracking-[0.16em] text-[#7fa6d1]">Frame score</span>
                  <div className="flex items-center gap-1 text-xs text-[#8beaff]">
                    <TrendIcon trend={contact.frame.trend} />
                    <span className="uppercase">{contact.frame.trend}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2 text-xs text-[#7fa6d1]">
              <div className="rounded-xl bg-[#0e1a2d] border border-[#1f2f45] p-3">
                <div className="uppercase tracking-[0.12em] text-[10px] text-[#5f7ca6]">Last contact</div>
                <div className="text-white text-sm mt-1 font-semibold">
                  {contact.lastContactAt ? formatDate(contact.lastContactAt) : '—'}
                </div>
              </div>
              <div className="rounded-xl bg-[#0e1a2d] border border-[#1f2f45] p-3">
                <div className="uppercase tracking-[0.12em] text-[10px] text-[#5f7ca6]">Next action</div>
                <div className="text-white text-sm mt-1 font-semibold">
                  {contact.nextActionAt ? formatDate(contact.nextActionAt) : '—'}
                </div>
              </div>
              <div className="rounded-xl bg-[#0e1a2d] border border-[#1f2f45] p-3">
                <div className="uppercase tracking-[0.12em] text-[10px] text-[#5f7ca6]">Last scan</div>
                <div className="text-white text-sm mt-1 font-semibold">
                  {contact.frame.lastScanAt ? formatDate(contact.frame.lastScanAt) : 'Never'}
                </div>
              </div>
            </div>
          </MotionDiv>

          {/* Topics */}
          <div className={`${subCard} p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <Hash size={16} className="text-[#c49bff]" />
              <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">
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
              <p className="text-[#6b92b9] text-sm italic">No topics linked yet</p>
            )}
          </div>

          {/* Pipeline Status */}
          <div className={`${subCard} p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <Layout size={16} className="text-[#8beaff]" />
              <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">
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
                      className="p-3 bg-[#0d1627]/80 border border-[#1f2f45] rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-sm font-bold text-white">{template.name}</div>
                          {item.label && (
                            <div className="text-xs text-[#7fa6d1]">{item.label}</div>
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
                        <span className="text-xs text-[#9cc8ff]">{currentStage.name}</span>
                        <span className="text-[10px] text-[#6b92b9] ml-auto">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {item.closedAt && (
                        <div className="text-[10px] text-[#6b92b9] mt-1">
                          Closed: {new Date(item.closedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-[#6b92b9] text-sm italic mb-2">Not in any pipeline yet</p>
                <button
                  onClick={() => {
                    // Simple: could navigate to Pipelines view, but keeping minimal for now
                    // This could be enhanced to open Pipelines view with contact pre-selected
                  }}
                  className="text-xs text-[#8beaff] hover:text-white transition-colors"
                >
                  Add to pipeline →
                </button>
              </div>
            )}
          </div>

          {/* Timeline (Interactions + Notes) */}
          {isWidgetVisible('timeline') && (
          <div className={`${glassCard} p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-[#8beaff]" />
              <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">Engagement Timeline</h3>
              <span className="text-[11px] text-[#7fa6d1] ml-auto">{timelineItems.length} entries</span>
            </div>

            <div className="mb-5 rounded-2xl bg-[#0d1627]/80 border border-[#1f2f45] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              <svg className="w-full h-40" viewBox="0 0 100 110" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="timelineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1cf1ff" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#7a5dff" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <polyline
                  fill="url(#timelineGradient)"
                  stroke="#1cf1ff"
                  strokeWidth="1.5"
                  points={`0,110 ${engagementPolylinePoints} 100,110`}
                  className="drop-shadow-[0_8px_24px_rgba(28,241,255,0.3)]"
                />
                <polyline
                  fill="none"
                  stroke="#7a5dff"
                  strokeWidth="1"
                  strokeOpacity="0.6"
                  points={engagementPolylinePoints}
                />
                {engagementSeries.map((point, idx) => {
                  const x = engagementSeries.length > 1 ? (idx / (engagementSeries.length - 1)) * 100 : 0;
                  const y = 100 - point.value * 0.9;
                  return (
                    <circle key={idx} cx={x} cy={y} r="1.4" fill="#1cf1ff" />
                  );
                })}
              </svg>
              <div className="flex justify-between text-[10px] text-[#6b92b9] mt-2">
                {engagementSeries.map((point, idx) => (
                  <span
                    key={`${point.label}-${idx}`}
                    className={`${idx % 3 !== 0 ? 'opacity-0 md:opacity-60' : ''}`}
                  >
                    {point.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Add Interaction Form */}
            <div className="mb-4 space-y-2 p-3 bg-[#0d1627]/80 rounded-2xl border border-[#1f2f45] shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              <div className="flex gap-2 flex-col md:flex-row">
                <select
                  value={newInteractionType}
                  onChange={(e) => setNewInteractionType(e.target.value as InteractionType)}
                  className="flex-1 bg-[#0a1020]/80 border border-[#1a2a3f] rounded-lg px-2 py-2 text-[#dce8ff] text-xs focus:border-[#2ee0ff] outline-none"
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
                  className="bg-[#0a1020]/80 border border-[#1a2a3f] rounded-lg px-2 py-2 text-[#dce8ff] text-xs focus:border-[#2ee0ff] outline-none"
                />
              </div>
              <textarea
                value={newInteractionSummary}
                onChange={(e) => setNewInteractionSummary(e.target.value)}
                placeholder="Summary..."
                className="w-full bg-[#0a1020]/80 border border-[#1a2a3f] rounded-lg px-2 py-2 text-[#dce8ff] text-xs resize-none focus:border-[#2ee0ff] outline-none"
                rows={2}
              />
              <button
                onClick={handleAddInteraction}
                disabled={!newInteractionSummary.trim()}
                className="w-full px-3 py-2 bg-gradient-to-r from-[#34f5ff] to-[#7a5dff] hover:opacity-95 disabled:bg-[#1a2a3f] disabled:cursor-not-allowed text-[#03101d] text-xs font-bold rounded-lg transition-colors shadow-[0_12px_30px_rgba(24,210,255,0.35)]"
              >
                Log Interaction
              </button>
            </div>

          {/* Timeline Items */}
          {timelineItems.length > 0 ? (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {timelineItems.map((item) => {
                  const isEditing = item.type === 'interaction' && editingInteractionId === item.id;
                  const interaction = item.interaction;

                  return (
                    <div key={item.id} className="border-l-2 border-[#2ee0ff44] pl-3 py-2">
                      {isEditing && editInteractionForm ? (
                        // Edit mode for interaction
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {item.interactionType && (
                                <div className="flex items-center gap-1">
                                  {getInteractionTypeIcon(item.interactionType)}
                                  <span className="text-[10px] text-[#6b92b9] uppercase font-bold">
                                    {getInteractionTypeLabel(item.interactionType)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={handleCancelEditInteraction}
                                className="p-1 text-[#6b92b9] hover:text-white"
                                title="Cancel"
                              >
                                <X size={12} />
                              </button>
                              <button
                                onClick={handleSaveEditInteraction}
                                className="p-1 text-[#8beaff] hover:text-white"
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
                              className="w-full bg-[#0a1020]/80 border border-[#1a2a3f] rounded px-2 py-1.5 text-[#dce8ff] text-xs focus:border-[#2ee0ff] outline-none"
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
                              className="w-full bg-[#0a1020]/80 border border-[#1a2a3f] rounded px-2 py-1.5 text-[#dce8ff] text-xs focus:border-[#2ee0ff] outline-none"
                            />
                            <textarea
                              value={editInteractionForm.summary}
                              onChange={(e) => setEditInteractionForm(prev => prev ? { ...prev, summary: e.target.value } : null)}
                              className="w-full bg-[#0a1020]/80 border border-[#1a2a3f] rounded px-2 py-1.5 text-[#dce8ff] text-xs focus:border-[#2ee0ff] outline-none resize-none"
                              rows={3}
                            />
                            {/* File upload for attachments */}
                            <div>
                              <label className="text-[10px] text-[#6b92b9] mb-1 block">Attachments</label>
                              <input
                                type="file"
                                multiple
                                accept="image/*,application/pdf"
                                onChange={(e) => handleAttachmentFileChange(item.id, e)}
                                className="w-full bg-[#0a1020]/80 border border-[#1a2a3f] rounded px-2 py-1.5 text-[#dce8ff] text-xs focus:border-[#2ee0ff] outline-none file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-gradient-to-r from-[#1cf1ff] to-[#7a5dff] file:text-[#04101f] hover:file:opacity-90 file:cursor-pointer cursor-pointer"
                              />
                            </div>
                            {/* Existing attachments */}
                            {interaction?.attachments && interaction.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {interaction.attachments.map((attachment) => (
                                  <div
                                    key={attachment.id}
                                    className="flex items-center gap-1 px-2 py-1 bg-[#0d1627]/80 border border-[#1f2f45] rounded text-xs"
                                  >
                                    {getAttachmentIcon(attachment.mimeType)}
                                    <button
                                      onClick={() => handleOpenAttachment(attachment)}
                                      className="text-[#8beaff] hover:text-white transition-colors"
                                    >
                                      {attachment.fileName}
                                    </button>
                                    <button
                                      onClick={() => handleRemoveAttachment(item.id, attachment.id)}
                                      className="text-[#6b92b9] hover:text-red-400 transition-colors ml-1"
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
                                  <span className="text-[10px] text-[#6b92b9] uppercase font-bold">
                                    {getInteractionTypeLabel(item.interactionType)}
                                  </span>
                                </div>
                              )}
                              {item.type === 'note' && (
                                <div className="flex items-center gap-1">
                                  <FileText size={12} className="text-[#6b92b9]" />
                                  <span className="text-[10px] text-[#6b92b9] uppercase font-bold">Note</span>
                                </div>
                              )}
                              <span className="text-[10px] text-[#7fa6d1]">
                                {formatDateTime(item.occurredAt)}
                              </span>
                            </div>
                            {item.type === 'interaction' && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => interaction && handleStartEditInteraction(interaction)}
                                  className="p-1 text-[#6b92b9] hover:text-[#8beaff] transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => handleDeleteInteraction(item.id)}
                                  className="p-1 text-[#6b92b9] hover:text-red-400 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-white/80 leading-relaxed mb-2">{item.summary}</p>
                          {/* Attachments in view mode */}
                          {interaction?.attachments && interaction.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {interaction.attachments.map((attachment) => (
                                <button
                                  key={attachment.id}
                                  onClick={() => handleOpenAttachment(attachment)}
                                  className="flex items-center gap-1 px-2 py-1 bg-[#0d1627]/80 border border-[#1f2f45] rounded text-xs hover:border-[#2ee0ff] transition-colors"
                                >
                                  {getAttachmentIcon(attachment.mimeType)}
                                  <span className="text-[#8beaff] hover:text-white">{attachment.fileName}</span>
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
              <p className="text-[#6b92b9] text-sm italic">No timeline entries yet</p>
            )}
          </div>
          )}

          {/* Timeline Stats (Last Contact, Next Action, Last Scan) */}
          {isWidgetVisible('keyDates') && (
          <div className={`${subCard} p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-[#8beaff]" />
              <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">Key Dates</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#0d1627]/80 border border-[#1f2f45] p-3">
                <span className="text-[10px] text-[#6b92b9] uppercase tracking-[0.12em]">Last Contact</span>
                <div className="text-lg text-white font-semibold mt-1">
                  {contact.lastContactAt ? formatDate(contact.lastContactAt) : '—'}
                </div>
              </div>
              <div className="rounded-xl bg-[#0d1627]/80 border border-[#1f2f45] p-3">
                <span className="text-[10px] text-[#6b92b9] uppercase tracking-[0.12em]">Next Action</span>
                <div className={`text-lg font-semibold mt-1 ${contact.nextActionAt ? 'text-[#8beaff]' : 'text-white'}`}>
                  {contact.nextActionAt ? formatDate(contact.nextActionAt) : '—'}
                </div>
              </div>
              <div className="rounded-xl bg-[#0d1627]/80 border border-[#1f2f45] p-3">
                <span className="text-[10px] text-[#6b92b9] uppercase tracking-[0.12em]">Last Scan</span>
                <div className="text-lg text-white font-semibold mt-1">
                  {contact.frame.lastScanAt ? formatDate(contact.frame.lastScanAt) : 'Never'}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Frame Scan Section with Framelord Assistant */}
          {isWidgetVisible('frameScan') && (
          <div className={`${glassCard} p-4`}>
            <FrameScanContactTab
              contactId={selectedContactId}
              contactName={contact.fullName}
              onViewReport={(reportId) => onNavigateToFrameScanReport?.(reportId)}
            />
          </div>
          )}

          {/* AI Profile Section - Big Five Psychometric Profile */}
          {isWidgetVisible('aiProfile') && !isContactZero && (
          <div className={`${glassCard} p-4`}>
            <AIProfileWidget
              contactId={selectedContactId}
              contactName={contact.fullName}
            />
          </div>
          )}
        </div>

        {/* ZONE 4: NEXT ACTIONS - Tasks, Notes, Follow-ups */}
        <div className="space-y-6">
          {/* Zone 4 Header */}
          <div className="flex items-center gap-2 px-1 mb-2">
            <CheckSquare size={14} className="text-[#34f5ff]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b92b9]">Zone 4 — Next Actions</span>
          </div>

          {/* Tasks Section */}
          {isWidgetVisible('tasks') && (
          <div className={`${glassCard} p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <CheckSquare size={16} className="text-[#8beaff]" />
              <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">
                Tasks {!isContactZero && 'For'}
              </h3>
              <span className="text-[11px] text-[#7fa6d1] ml-auto">{openTasks.length} open</span>
            </div>

            {/* Add Task Form */}
            <div className="mb-4 space-y-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="New task..."
                className={inputClass}
              />
              <div className="flex gap-2">
                <DatePicker
                  value={newTaskDueDate}
                  onChange={setNewTaskDueDate}
                  placeholder="Select due date..."
                  className="flex-1"
                />
                <button
                  onClick={handleAddTask}
                  disabled={!newTaskTitle.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-[#34f5ff] to-[#7a5dff] hover:opacity-95 disabled:bg-[#1a2a3f] disabled:cursor-not-allowed text-[#03101d] text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-[0_10px_30px_rgba(24,210,255,0.35)]"
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
                    className="flex items-start gap-3 p-2 bg-[#0d1627]/80 rounded border border-[#1f2f45] hover:border-[#2ee0ff] transition-colors shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                  >
                    <button
                      onClick={() => handleMarkTaskDone(task.id)}
                      className="mt-0.5 text-[#6b92b9] hover:text-[#8beaff] transition-colors"
                      title="Mark as done"
                    >
                      <Square size={16} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{task.title}</p>
                      {task.dueAt && (
                        <p className="text-[10px] text-[#8beaff] mt-1">
                          Due: {formatDueDate(task.dueAt)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#6b92b9] text-sm italic">No open tasks</p>
            )}
          </div>
          )}

          {/* Projects Section */}
          {isWidgetVisible('projects') && (
          <div className={`${glassCard} p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <Layout size={16} className="text-[#c49bff]" />
              <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">
                Projects
              </h3>
              <span className="text-[11px] text-[#7fa6d1] ml-auto">{projects.length}</span>
            </div>

            {projects.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => onNavigateToProject && onNavigateToProject(project.id)}
                    className="p-3 bg-[#0d1627]/80 rounded border border-[#1f2f45] hover:border-[#c49bff] transition-colors cursor-pointer group shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-bold group-hover:text-[#c49bff] transition-colors">{project.name}</p>
                        {project.description && (
                          <p className="text-xs text-[#7fa6d1] mt-1 line-clamp-2">{project.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[#6b92b9]">
                      <span className="capitalize">{project.status.replace('_', ' ')}</span>
                      <span>•</span>
                      <span className="capitalize">{project.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#6b92b9] text-sm italic">No projects</p>
            )}
          </div>
          )}

          {/* Wants Connected Section */}
          {wantsConnected.length > 0 && (
          <div className={`${glassCard} p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-[#ff8f8f]" />
              <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">
                Wants Connected
              </h3>
              <span className="text-[11px] text-[#7fa6d1] ml-auto">{wantsConnected.length}</span>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {wantsConnected.map((want) => (
                <div
                  key={want.id}
                  className="p-3 bg-[#0d1627]/80 rounded border border-[#1f2f45] hover:border-[#ff8f8f] transition-colors group shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-bold group-hover:text-[#ff8f8f] transition-colors">{want.title}</p>
                      {want.reason && (
                        <p className="text-xs text-[#7fa6d1] mt-1 line-clamp-2">{want.reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-[#6b92b9]">
                    <span className={`capitalize ${
                      want.status === 'done' ? 'text-green-400' :
                      want.status === 'in_progress' ? 'text-yellow-400' : ''
                    }`}>{want.status.replace('_', ' ')}</span>
                    {want.deadline && (
                      <>
                        <span>•</span>
                        <span>Due: {new Date(want.deadline).toLocaleDateString()}</span>
                      </>
                    )}
                    {!want.directness.isDirect && (
                      <>
                        <span>•</span>
                        <span className="text-amber-400">⚠ Indirect</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Notes Section */}
          {isWidgetVisible('notes') && (
          <div className={`${glassCard} p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-[#8beaff]" />
              <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">
                Notes {!isContactZero && 'About'}
              </h3>
              <span className="text-[11px] text-[#7fa6d1] ml-auto">{notesAboutContact.length} total</span>
            </div>

            <div className="mb-4">
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                onKeyDown={handleNoteKeyDown}
                placeholder={`Add a note...`}
                className="w-full bg-[#0a1020]/80 border border-[#1a2a3f] rounded-lg p-3 text-[#e0edff] text-sm resize-none focus:border-[#2ee0ff] outline-none shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                rows={2}
              />
              <button
                onClick={handleAddNote}
                disabled={!newNoteContent.trim()}
                className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-[#34f5ff] to-[#7a5dff] hover:opacity-95 disabled:bg-[#1a2a3f] disabled:cursor-not-allowed text-[#03101d] text-xs font-bold rounded-lg transition-colors shadow-[0_12px_30px_rgba(24,210,255,0.35)]"
              >
                <Send size={12} /> Add Note
              </button>
            </div>

            {notesAboutContact.length > 0 ? (
              <div className="space-y-3 max-h-[150px] overflow-y-auto">
                {notesAboutContact.slice(0, 3).map((note) => (
                  <div key={note.id} className="border-l-2 border-[#2ee0ff44] pl-3 py-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={10} className="text-[#6b92b9]" />
                      <span className="text-[10px] text-[#6b92b9]">{formatDate(note.createdAt)}</span>
                    </div>
                    <p className="text-sm text-white/80">{truncate(note.content, 80)}</p>
                  </div>
                ))}
                {notesAboutContact.length > 3 && (
                  <p className="text-xs text-[#6b92b9] pl-3">+{notesAboutContact.length - 3} more</p>
                )}
              </div>
            ) : (
              <p className="text-[#6b92b9] text-sm italic">No notes yet</p>
            )}
          </div>
          )}

          {/* Notes Mentioning This Contact - Only shown for non-Contact Zero */}
          {!isContactZero && isWidgetVisible('notesMentioning') && (
          <div className={`${glassCard} p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <AtSign size={16} className="text-[#a8e6cf]" />
              <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">
                Notes Mentioning {contact.fullName?.split(' ')[0] || 'This Contact'}
              </h3>
              <span className="text-[11px] text-[#7fa6d1] ml-auto">{notesMentioningContact.length} total</span>
            </div>

            {notesMentioningContact.length === 0 ? (
              <div className="text-center py-4">
                <AtSign size={24} className="mx-auto text-[#6b92b9]/40 mb-2" />
                <p className="text-xs text-[#6b92b9]">No notes mention this contact yet</p>
                <p className="text-[10px] text-[#6b92b9]/60 mt-1">Use @{contact.fullName?.split(' ')[0] || 'Name'} in notes to link them here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[200px] overflow-y-auto">
                {notesMentioningContact.slice(0, 5).map((note) => (
                  <div
                    key={note.id}
                    className="border-l-2 border-[#a8e6cf44] pl-3 py-2 hover:bg-white/5 rounded-r cursor-pointer transition-colors"
                    onClick={() => {
                      // Navigate to Notes view with this note selected
                      console.log('[Dossier] Navigate to note:', note.id);
                    }}
                    title="Click to view note"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={10} className="text-[#a8e6cf]" />
                      {note.title && (
                        <span className="text-xs text-white font-medium truncate max-w-[180px]">{note.title}</span>
                      )}
                      <span className="text-[10px] text-[#6b92b9] ml-auto">{formatDate(note.createdAt)}</span>
                    </div>
                    <p className="text-xs text-white/70 line-clamp-2">{truncate(stripHtmlTags(note.content), 100)}</p>
                  </div>
                ))}
                {notesMentioningContact.length > 5 && (
                  <p className="text-xs text-[#6b92b9] pl-3 pt-2">+{notesMentioningContact.length - 5} more notes</p>
                )}
              </div>
            )}
          </div>
          )}

          {/* Tags */}
          {isWidgetVisible('tags') && (
          <div className={`${glassCard} p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <Tag size={16} className="text-[#ffc78f]" />
              <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">Tags</h3>
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
                  <span key={tag} className="text-xs px-3 py-1 rounded-full bg-[#0d1627]/80 text-[#8beaff] border border-[#1f2f45] shadow-[0_8px_20px_rgba(0,0,0,0.25)]">
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[#6b92b9] text-sm italic">No tags set</p>
            )}
          </div>
          )}
        </div>
      </div>
        </>
        )}

      {/* CONTACT ZERO ONLY: Your Open Tasks (what you owe to others) */}
      {isContactZero && isWidgetVisible('openTasksOwed') && openTasksByContact.size > 0 && (
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
      {isContactZero && isWidgetVisible('upcomingTasks') && upcomingDates.length > 0 && (
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
      {isContactZero && isWidgetVisible('topics') && topicsForAuthor.length > 0 && (
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
      {isContactZero && isWidgetVisible('lastInteractions') && lastInteractions.length > 0 && (
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
      {isContactZero && isWidgetVisible('activityFeed') && activityNotes.length > 0 && (
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

      {/* Attachments Section */}
      {isWidgetVisible('attachments') && (
      <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Paperclip size={16} className="text-[#4433FF]" />
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Attachments
            </h3>
            <span className="text-[10px] text-gray-600 ml-2">({allAttachments.length})</span>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={attachmentSearch}
            onChange={(e) => setAttachmentSearch(e.target.value)}
            placeholder="Search attachments..."
            className="flex-1 bg-[#1A1A1D] border border-[#333] rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-[#4433FF] outline-none"
          />
          <div className="flex gap-1">
            {(['all', 'image', 'audio', 'file'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setAttachmentFilter(type)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  attachmentFilter === type
                    ? 'bg-[#4433FF] text-white'
                    : 'bg-[#1A1A1D] text-gray-400 hover:text-white'
                }`}
              >
                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Attachments Grid */}
        {allAttachments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allAttachments.map((item) => (
              <div
                key={item.attachment.id}
                className="bg-[#1A1A1D] border border-[#333] rounded-lg p-4 hover:border-[#4433FF]/50 transition-colors"
              >
                {item.attachment.type === 'image' && (
                  <div className="space-y-2">
                    <img
                      src={item.attachment.dataUrl}
                      alt={item.attachment.filename || 'Image'}
                      className="w-full h-32 object-cover rounded border border-[#333] cursor-pointer hover:border-[#4433FF]/50"
                      onClick={() => window.open(item.attachment.dataUrl, '_blank')}
                    />
                    <div className="text-xs text-gray-400 truncate">
                      {item.attachment.filename || 'Image'}
                    </div>
                    {item.noteTitle && (
                      <div className="text-[10px] text-gray-600">
                        From: {item.noteTitle}
                      </div>
                    )}
                  </div>
                )}
                {item.attachment.type === 'audio' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-[#0E0E0E] rounded">
                      <Music size={16} className="text-[#4433FF]" />
                      <audio
                        src={item.attachment.dataUrl}
                        controls
                        className="flex-1 h-8"
                      />
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {item.attachment.filename || 'Audio'}
                    </div>
                    {item.noteTitle && (
                      <div className="text-[10px] text-gray-600">
                        From: {item.noteTitle}
                      </div>
                    )}
                  </div>
                )}
                {(item.attachment.type === 'file' || item.attachment.mimeType === 'application/pdf') && (
                  <div className="space-y-2">
                    <a
                      href={item.attachment.dataUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-[#0E0E0E] rounded hover:bg-[#1A1A1D] transition-colors"
                    >
                      <File size={16} className="text-[#4433FF]" />
                      <span className="text-xs text-gray-300 hover:text-[#4433FF] truncate flex-1">
                        {item.attachment.filename || 'File'}
                      </span>
                    </a>
                    {item.noteTitle && (
                      <div className="text-[10px] text-gray-600">
                        From: {item.noteTitle}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600 text-sm">
            No attachments found
          </div>
        )}
      </div>
      )}

      {/* BOTTOM: Stats Summary */}
      {isWidgetVisible('statsSummary') && (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className={`${subCard} p-4`}>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare size={12} className="text-[#8beaff]" />
            <span className="text-[9px] font-bold text-white uppercase tracking-[0.14em]">Tasks</span>
          </div>
          <div className="text-2xl font-display font-bold text-[#8beaff]">{openTasks.length}</div>
          <div className="text-[10px] text-[#6b92b9]">open</div>
        </div>

        <div className={`${subCard} p-4`}>
          <div className="flex items-center gap-2 mb-1">
            <FileText size={12} className="text-[#8beaff]" />
            <span className="text-[9px] font-bold text-white uppercase tracking-[0.14em]">Notes</span>
          </div>
          <div className="text-2xl font-display font-bold text-white">{notesAboutContact.length}</div>
          <div className="text-[10px] text-[#6b92b9]">entries</div>
        </div>

        <div className={`${subCard} p-4`}>
          <div className="flex items-center gap-2 mb-1">
            <Hash size={12} className="text-[#c49bff]" />
            <span className="text-[9px] font-bold text-white uppercase tracking-[0.14em]">Topics</span>
          </div>
          <div className="text-2xl font-display font-bold text-[#c49bff]">{topicsForContact.length}</div>
          <div className="text-[10px] text-[#6b92b9]">linked</div>
        </div>

        <div className={`${subCard} p-4`}>
          <div className="flex items-center gap-2 mb-1">
            <Activity size={12} className="text-[#8beaff]" />
            <span className="text-[9px] font-bold text-white uppercase tracking-[0.14em]">Frame</span>
          </div>
          <div className={`text-2xl font-display font-bold ${scoreColor}`}>{contact.frame.currentScore}</div>
          <div className="text-[10px] text-[#6b92b9]">score</div>
        </div>

        <div className={`${subCard} p-4`}>
          <div className="flex items-center gap-2 mb-1">
            <Tag size={12} className="text-[#ffc78f]" />
            <span className="text-[9px] font-bold text-white uppercase tracking-[0.14em]">Tags</span>
          </div>
          <div className="text-2xl font-display font-bold text-white">{contact.tags.length}</div>
          <div className="text-[10px] text-[#6b92b9]">labels</div>
        </div>
      </div>
      )}
    </div>
  </div>
);
};
