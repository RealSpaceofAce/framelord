// =============================================================================
// PROJECT DETAIL VIEW — Notion/Asana-style project view with tabs
// =============================================================================
// Clean, modular project view with:
// - Overview: Banner, description, dates, stats, contacts
// - Tasks: Asana-style sections with task management
// - Files: Attachments
// - Scans: Frame analysis
// - Settings: Edit project, upload banner
// =============================================================================

import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  LayoutDashboard,
  CheckSquare,
  Paperclip,
  Scan,
  Settings,
  Plus,
  X,
  Edit2,
  Trash2,
  Circle,
  CheckCircle,
  Calendar as CalendarIcon,
  Users,
  Download,
  Image as ImageIcon
} from 'lucide-react';
import type { Project, ProjectSection as ProjectSectionType, Task } from '../../types';
import { TabNavigation, TabItem } from '../ui/TabNavigation';
import { DatePicker } from '../DatePicker';
import {
  getProjectById,
  updateProject,
  getSectionsByProject,
  createSection,
  deleteSection,
  getTaskLinksForSection,
  addTaskToProjectSection,
  moveTaskBetweenSections,
  removeTaskFromProject,
  addAttachmentToProject,
  removeAttachmentFromProject,
  addRelatedContact,
  removeRelatedContact
} from '../../services/projectStore';
import { getContactById, getContactsExcludingSelf, CONTACT_ZERO } from '../../services/contactStore';
import { getTaskById, createTask } from '../../services/taskStore';

interface ProjectDetailViewProps {
  projectId: string;
  onBack: () => void;
  selectedContactId: string;
  setSelectedContactId: (id: string) => void;
  onNavigateToDossier?: () => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  projectId,
  onBack,
  selectedContactId,
  setSelectedContactId,
  onNavigateToDossier
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const project = getProjectById(projectId);

  if (!project) {
    return (
      <div className="space-y-6 pb-20">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Back to Projects
        </button>
        <div className="text-center py-12 text-gray-500">
          <p>Project not found</p>
        </div>
      </div>
    );
  }

  const sections = getSectionsByProject(projectId);
  const primaryContact = getContactById(project.primaryContactId);
  const relatedContacts = project.relatedContactIds.map(id => getContactById(id)).filter(Boolean);

  // Count tasks across all sections
  const totalTasks = sections.reduce((sum, section) => {
    return sum + getTaskLinksForSection(section.id).length;
  }, 0);

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateProject({ ...project, bannerUrl: dataUrl });
      setRefreshKey(k => k + 1);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBanner = () => {
    updateProject({ ...project, bannerUrl: undefined });
    setRefreshKey(k => k + 1);
  };

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, badge: totalTasks },
    { id: 'files', label: 'Files', icon: Paperclip, badge: project.attachments.length },
    { id: 'scans', label: 'Scans', icon: Scan, badge: 0 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="space-y-0 pb-20">
      {/* Back Button */}
      <div className="mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Back to Projects
        </button>
      </div>

      {/* Project Header with Banner */}
      <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-t-xl overflow-hidden">
        {/* Banner Section */}
        {project.bannerUrl ? (
          <div className="relative h-48 w-full group">
            <img
              src={project.bannerUrl}
              alt="Project banner"
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

        {/* Project Title and Description */}
        <div className="p-6">
          <h1 className="text-2xl font-display font-bold text-white mb-2">
            {project.name}
          </h1>
          {project.description && (
            <p className="text-sm text-gray-400 mb-4">
              {project.description}
            </p>
          )}

          {/* Quick Stats */}
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckSquare size={14} />
              <span>{totalTasks} tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={14} />
              <span>{1 + relatedContacts.length} people</span>
            </div>
            <div className="flex items-center gap-2">
              <Paperclip size={14} />
              <span>{project.attachments.length} files</span>
            </div>
            {project.dueDate && (
              <div className="flex items-center gap-2">
                <CalendarIcon size={14} />
                <span>Due {new Date(project.dueDate).toLocaleDateString()}</span>
              </div>
            )}
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
            project={project}
            primaryContact={primaryContact}
            relatedContacts={relatedContacts}
            onContactClick={(contactId) => {
              setSelectedContactId(contactId);
              onNavigateToDossier?.();
            }}
            onRefresh={() => setRefreshKey(k => k + 1)}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksTab
            projectId={projectId}
            sections={sections}
            onRefresh={() => setRefreshKey(k => k + 1)}
          />
        )}

        {activeTab === 'files' && (
          <FilesTab
            project={project}
            onRefresh={() => setRefreshKey(k => k + 1)}
          />
        )}

        {activeTab === 'scans' && (
          <ScansTab project={project} />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            project={project}
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
  project: Project;
  primaryContact: any;
  relatedContacts: any[];
  onContactClick: (id: string) => void;
  onRefresh: () => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  project,
  primaryContact,
  relatedContacts,
  onContactClick,
  onRefresh
}) => {
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [selectedNewContact, setSelectedNewContact] = useState('');

  const availableContacts = getContactsExcludingSelf().filter(
    c => c.id !== project.primaryContactId && !project.relatedContactIds.includes(c.id)
  );

  const handleAddContact = () => {
    if (selectedNewContact) {
      addRelatedContact(project.id, selectedNewContact);
      setSelectedNewContact('');
      setIsAddingContact(false);
      onRefresh();
    }
  };

  const handleRemoveContact = (contactId: string) => {
    removeRelatedContact(project.id, contactId);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Project Details */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
            Status
          </div>
          <div className="text-sm text-white capitalize">{project.status.replace('_', ' ')}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
            Priority
          </div>
          <div className={`text-sm font-bold capitalize ${
            project.priority === 'critical' ? 'text-red-400' :
            project.priority === 'high' ? 'text-orange-400' :
            project.priority === 'medium' ? 'text-yellow-400' :
            'text-gray-400'
          }`}>
            {project.priority}
          </div>
        </div>
        {project.startDate && (
          <div>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
              Start Date
            </div>
            <div className="text-sm text-white">
              {new Date(project.startDate).toLocaleDateString()}
            </div>
          </div>
        )}
        {project.dueDate && (
          <div>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
              Due Date
            </div>
            <div className="text-sm text-white">
              {new Date(project.dueDate).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      {/* People Section */}
      <div className="pt-6 border-t border-[#2A2A2A]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            People
          </h3>
          <button
            onClick={() => setIsAddingContact(!isAddingContact)}
            className="text-xs text-[#4433FF] hover:text-white transition-colors flex items-center gap-1"
          >
            <Plus size={12} />
            Add Person
          </button>
        </div>

        {/* Add Contact Form */}
        {isAddingContact && (
          <div className="mb-4 p-3 bg-[#1A1A1D] border border-[#333] rounded-lg">
            <div className="flex gap-2">
              <select
                value={selectedNewContact}
                onChange={(e) => setSelectedNewContact(e.target.value)}
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
                onClick={handleAddContact}
                disabled={!selectedNewContact}
                className="px-3 py-2 bg-[#4433FF] hover:bg-[#5544FF] disabled:bg-[#333] disabled:cursor-not-allowed text-white text-xs font-bold rounded transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAddingContact(false);
                  setSelectedNewContact('');
                }}
                className="px-3 py-2 bg-[#1A1A1D] border border-[#333] hover:border-red-500 text-white text-xs font-bold rounded transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Primary Contact */}
        {primaryContact && (
          <div className="mb-3">
            <div className="text-[10px] text-gray-600 font-bold mb-2">PRIMARY</div>
            <div
              onClick={() => onContactClick(primaryContact.id)}
              className="flex items-center gap-3 p-3 bg-[#1A1A1D] border border-[#333] rounded-lg hover:border-[#4433FF] transition-colors cursor-pointer"
            >
              <img
                src={primaryContact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${primaryContact.id}`}
                alt={primaryContact.fullName}
                className="w-10 h-10 rounded-full border border-[#333]"
              />
              <div className="flex-1">
                <div className="text-sm font-bold text-white">{primaryContact.fullName}</div>
                <div className="text-xs text-gray-500">{primaryContact.relationshipRole}</div>
              </div>
            </div>
          </div>
        )}

        {/* Related Contacts */}
        {relatedContacts.length > 0 && (
          <div>
            <div className="text-[10px] text-gray-600 font-bold mb-2">TEAM</div>
            <div className="space-y-2">
              {relatedContacts.map(contact => (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 p-3 bg-[#1A1A1D] border border-[#333] rounded-lg hover:border-[#4433FF] transition-colors group"
                >
                  <img
                    src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                    alt={contact.fullName}
                    className="w-10 h-10 rounded-full border border-[#333] cursor-pointer"
                    onClick={() => onContactClick(contact.id)}
                  />
                  <div className="flex-1 cursor-pointer" onClick={() => onContactClick(contact.id)}>
                    <div className="text-sm font-bold text-white">{contact.fullName}</div>
                    <div className="text-xs text-gray-500">{contact.relationshipRole}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveContact(contact.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// TASKS TAB (Asana-style sections)
// =============================================================================

interface TasksTabProps {
  projectId: string;
  sections: ProjectSectionType[];
  onRefresh: () => void;
}

const TasksTab: React.FC<TasksTabProps> = ({ projectId, sections, onRefresh }) => {
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({});

  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    createSection({ projectId, name: newSectionName });
    setNewSectionName('');
    setIsAddingSection(false);
    onRefresh();
  };

  const handleDeleteSection = (sectionId: string) => {
    if (confirm('Delete this section? Tasks will be moved to the first remaining section.')) {
      deleteSection(sectionId);
      onRefresh();
    }
  };

  const handleAddTask = (sectionId: string) => {
    const title = newTaskTitles[sectionId]?.trim();
    if (!title) return;

    const project = getProjectById(projectId);
    if (!project) return;

    // Create task linked to project's primary contact
    const newTask = createTask({
      contactId: project.primaryContactId,
      title,
      dueAt: null,
      status: 'open'
    });

    // Link to section
    addTaskToProjectSection(newTask.id, projectId, sectionId);

    // Clear input
    setNewTaskTitles(prev => ({ ...prev, [sectionId]: '' }));
    onRefresh();
  };

  const handleToggleTask = (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'open' : 'done';
    const task = getTaskById(taskId);
    if (task) {
      task.status = newStatus as any;
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Section Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Task Sections</h3>
        {!isAddingSection && (
          <button
            onClick={() => setIsAddingSection(true)}
            className="text-xs text-[#4433FF] hover:text-white transition-colors flex items-center gap-1"
          >
            <Plus size={12} />
            Add Section
          </button>
        )}
      </div>

      {/* Add Section Form */}
      {isAddingSection && (
        <div className="p-3 bg-[#1A1A1D] border border-[#333] rounded-lg">
          <div className="flex gap-2">
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
              placeholder="Section name..."
              className="flex-1 bg-[#0E0E0E] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
              autoFocus
            />
            <button
              onClick={handleAddSection}
              disabled={!newSectionName.trim()}
              className="px-3 py-2 bg-[#4433FF] hover:bg-[#5544FF] disabled:bg-[#333] disabled:cursor-not-allowed text-white text-xs font-bold rounded transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => {
                setIsAddingSection(false);
                setNewSectionName('');
              }}
              className="px-3 py-2 bg-[#1A1A1D] border border-[#333] hover:border-red-500 text-white text-xs font-bold rounded transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sections.map(section => {
          const taskLinks = getTaskLinksForSection(section.id);
          const tasks = taskLinks.map(link => getTaskById(link.taskId)).filter(Boolean) as Task[];

          return (
            <div key={section.id} className="bg-[#1A1A1D] border border-[#333] rounded-xl p-4">
              {/* Section Header */}
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-white">{section.name}</h4>
                <button
                  onClick={() => handleDeleteSection(section.id)}
                  className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Tasks List */}
              <div className="space-y-2 mb-3">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-start gap-2 p-2 bg-[#0E0E0E] border border-[#2A2A2A] rounded hover:border-[#4433FF]/50 transition-colors group"
                  >
                    <button
                      onClick={() => handleToggleTask(task.id, task.status)}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {task.status === 'done' ? (
                        <CheckCircle size={16} className="text-green-500" />
                      ) : (
                        <Circle size={16} className="text-gray-600 group-hover:text-gray-400" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className={`text-sm ${task.status === 'done' ? 'text-gray-600 line-through' : 'text-white'}`}>
                        {task.title}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Task Input */}
              <input
                type="text"
                value={newTaskTitles[section.id] || ''}
                onChange={(e) => setNewTaskTitles(prev => ({ ...prev, [section.id]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask(section.id)}
                placeholder="+ Add task"
                className="w-full bg-[#0E0E0E] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:border-[#4433FF] outline-none"
              />
            </div>
          );
        })}
      </div>

      {sections.length === 0 && !isAddingSection && (
        <div className="text-center py-12 text-gray-600">
          <p className="mb-3">No sections yet</p>
          <button
            onClick={() => setIsAddingSection(true)}
            className="text-[#4433FF] hover:text-white transition-colors"
          >
            Create your first section
          </button>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// FILES TAB
// =============================================================================

interface FilesTabProps {
  project: Project;
  onRefresh: () => void;
}

const FilesTab: React.FC<FilesTabProps> = ({ project, onRefresh }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      addAttachmentToProject(project.id, {
        fileName: file.name,
        mimeType: file.type,
        dataUrl
      });
      onRefresh();
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = (attachment: any) => {
    const link = document.createElement('a');
    link.href = attachment.dataUrl;
    link.download = attachment.fileName;
    link.click();
  };

  const handleDelete = (attachmentId: string) => {
    if (confirm('Delete this file?')) {
      removeAttachmentFromProject(project.id, attachmentId);
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Attachments</h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-xs text-[#4433FF] hover:text-white transition-colors flex items-center gap-1"
        >
          <Plus size={12} />
          Upload File
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
      />

      {project.attachments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {project.attachments.map(attachment => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 bg-[#1A1A1D] border border-[#333] rounded-lg hover:border-[#4433FF] transition-colors group"
            >
              <div className="p-2 bg-[#0E0E0E] rounded">
                <Paperclip size={20} className="text-[#4433FF]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {attachment.fileName}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(attachment.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => handleDownload(attachment)}
                className="p-2 text-gray-500 hover:text-white transition-colors"
              >
                <Download size={16} />
              </button>
              <button
                onClick={() => handleDelete(attachment.id)}
                className="p-2 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-600">
          <Paperclip size={48} className="mx-auto mb-4 text-gray-700" />
          <p className="mb-3">No files attached</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[#4433FF] hover:text-white transition-colors"
          >
            Upload your first file
          </button>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SCANS TAB
// =============================================================================

interface ScansTabProps {
  project: Project;
}

const ScansTab: React.FC<ScansTabProps> = ({ project }) => {
  return (
    <div className="text-center py-12">
      <Scan size={48} className="text-gray-600 mx-auto mb-4" />
      <h3 className="text-lg font-bold text-white mb-2">Frame Analysis</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
        Run Frame scans on project communications to identify authority leaks and optimize messaging
      </p>
      <button className="px-6 py-3 bg-gradient-to-r from-[#4433FF] to-[#6A82FC] hover:opacity-90 text-white text-sm font-bold rounded transition-opacity inline-flex items-center gap-2">
        <Scan size={16} />
        Run Frame Scan
      </button>
      <div className="mt-8 text-xs text-gray-600">
        <p>No scans yet. Frame scans will appear here once run.</p>
      </div>
    </div>
  );
};

// =============================================================================
// SETTINGS TAB
// =============================================================================

interface SettingsTabProps {
  project: Project;
  onRefresh: () => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ project, onRefresh }) => {
  const [editData, setEditData] = useState<Partial<Project>>({});
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    updateProject({ ...project, ...editData });
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
        <h3 className="text-sm font-bold text-white mb-4">Project Settings</h3>

        {!isEditing ? (
          <div className="space-y-4">
            <div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
                Project Name
              </div>
              <div className="text-sm text-white">{project.name}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
                Description
              </div>
              <div className="text-sm text-white">{project.description || 'No description'}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
                  Status
                </div>
                <div className="text-sm text-white capitalize">{project.status.replace('_', ' ')}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
                  Priority
                </div>
                <div className="text-sm text-white capitalize">{project.priority}</div>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] text-white text-xs font-bold rounded transition-colors flex items-center gap-2"
            >
              <Edit2 size={14} />
              Edit Project
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={editData.name ?? project.name}
                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
                Description
              </label>
              <textarea
                value={editData.description ?? project.description ?? ''}
                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none resize-none"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
                  Status
                </label>
                <select
                  value={editData.status ?? project.status}
                  onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
                  Priority
                </label>
                <select
                  value={editData.priority ?? project.priority}
                  onChange={(e) => setEditData(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
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
    </div>
  );
};
