import React, { useState, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, Edit2, CheckCircle, Circle, User, Calendar as CalendarIcon, MoreVertical, X, Check, Paperclip, File, Download, Users, Scan } from 'lucide-react';
import type { Project, ProjectSection as ProjectSectionType, Task, TaskStatus } from '../../types';
import { DatePicker } from '../DatePicker';
import {
  getProjectById,
  updateProject,
  getSectionsByProject,
  createSection,
  updateSection,
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
import { getTaskById, createTask, updateTaskStatus } from '../../services/taskStore';

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
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingProjectData, setEditingProjectData] = useState<Partial<Project>>({});
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [selectedNewContact, setSelectedNewContact] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSaveProject = () => {
    updateProject({ ...project, ...editingProjectData });
    setIsEditingProject(false);
    setEditingProjectData({});
  };

  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    createSection({ projectId, name: newSectionName });
    setNewSectionName('');
    setIsAddingSection(false);
  };

  const handleDeleteSection = (sectionId: string) => {
    if (confirm('Delete this section? Tasks will be moved to the first remaining section.')) {
      deleteSection(sectionId);
    }
  };

  const handleContactClick = (contactId: string) => {
    setSelectedContactId(contactId);
    if (onNavigateToDossier) {
      onNavigateToDossier();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      addAttachmentToProject(projectId, {
        fileName: file.name,
        mimeType: file.type,
        dataUrl
      });
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    if (confirm('Remove this attachment?')) {
      removeAttachmentFromProject(projectId, attachmentId);
    }
  };

  const handleAddContact = () => {
    if (selectedNewContact) {
      addRelatedContact(projectId, selectedNewContact);
      setSelectedNewContact('');
      setIsAddingContact(false);
    }
  };

  const handleRemoveContact = (contactId: string) => {
    if (confirm('Remove this contact from the project?')) {
      removeRelatedContact(projectId, contactId);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft size={16} />
        Back to Projects
      </button>

      {/* Project Header */}
      <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
        {!isEditingProject ? (
          <>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-display font-bold text-white mb-2">
                  {project.name}
                </h1>
                {project.description && (
                  <p className="text-sm text-gray-400">{project.description}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setEditingProjectData(project);
                  setIsEditingProject(true);
                }}
                className="p-2 hover:bg-[#1A1A1D] rounded transition-colors"
              >
                <Edit2 size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Status</div>
                <div className="text-sm text-white capitalize">{project.status.replace('_', ' ')}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Priority</div>
                <div className="text-sm text-white capitalize">{project.priority}</div>
              </div>
              {project.startDate && (
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Start Date</div>
                  <div className="text-sm text-white">{project.startDate}</div>
                </div>
              )}
              {project.dueDate && (
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Due Date</div>
                  <div className="text-sm text-white">{project.dueDate}</div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-2">Project Name</label>
              <input
                type="text"
                value={editingProjectData.name || ''}
                onChange={(e) => setEditingProjectData({ ...editingProjectData, name: e.target.value })}
                className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-2">Description</label>
              <textarea
                value={editingProjectData.description || ''}
                onChange={(e) => setEditingProjectData({ ...editingProjectData, description: e.target.value })}
                rows={3}
                className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-2">Status</label>
                <select
                  value={editingProjectData.status || 'active'}
                  onChange={(e) => setEditingProjectData({ ...editingProjectData, status: e.target.value as any })}
                  className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm"
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Priority</label>
                <select
                  value={editingProjectData.priority || 'medium'}
                  onChange={(e) => setEditingProjectData({ ...editingProjectData, priority: e.target.value as any })}
                  className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-[#2A2A2A]">
              <button
                onClick={() => {
                  setIsEditingProject(false);
                  setEditingProjectData({});
                }}
                className="px-4 py-2 bg-[#1A1A1D] hover:bg-[#252528] text-gray-400 text-xs font-bold rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProject}
                className="px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] text-white text-xs font-bold rounded transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Primary Contact */}
      {primaryContact && (
        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-sm font-bold text-white mb-4">PRIMARY CONTACT</h3>
          <div
            onClick={() => handleContactClick(primaryContact.id)}
            className="flex items-center gap-3 p-3 bg-[#1A1A1D] rounded hover:bg-[#252528] transition-colors cursor-pointer"
          >
            {primaryContact.avatarUrl ? (
              <img src={primaryContact.avatarUrl} alt={primaryContact.fullName} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#4433FF]/20 flex items-center justify-center">
                <User size={20} className="text-[#4433FF]" />
              </div>
            )}
            <div className="flex-1">
              <div className="text-sm font-bold text-white">{primaryContact.fullName}</div>
              {primaryContact.email && (
                <div className="text-xs text-gray-500">{primaryContact.email}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Related Contacts */}
      <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-blue-500" />
            <h3 className="text-sm font-bold text-white">RELATED CONTACTS</h3>
          </div>
          <button
            onClick={() => setIsAddingContact(true)}
            className="px-3 py-1.5 bg-[#4433FF] hover:bg-[#5544FF] text-white text-xs font-bold rounded transition-colors flex items-center gap-1"
          >
            <Plus size={12} />
            Add Contact
          </button>
        </div>

        {isAddingContact && (
          <div className="mb-4 p-3 bg-[#1A1A1D] border border-[#4433FF] rounded space-y-2">
            <select
              value={selectedNewContact}
              onChange={(e) => setSelectedNewContact(e.target.value)}
              className="w-full bg-[#0E0E0E] border border-[#333] rounded px-3 py-2 text-white text-sm"
            >
              <option value="">Select a contact...</option>
              {getContactsExcludingSelf()
                .filter(c => c.id !== project.primaryContactId && !project.relatedContactIds.includes(c.id))
                .map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.fullName}
                  </option>
                ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleAddContact}
                disabled={!selectedNewContact}
                className="px-3 py-1.5 bg-[#4433FF] hover:bg-[#5544FF] text-white text-xs font-bold rounded transition-colors disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAddingContact(false);
                  setSelectedNewContact('');
                }}
                className="px-3 py-1.5 bg-[#1A1A1D] hover:bg-[#252528] text-gray-400 text-xs font-bold rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {relatedContacts.map((contact: any) => (
            <div
              key={contact.id}
              className="flex items-center gap-3 p-3 bg-[#1A1A1D] rounded hover:bg-[#252528] transition-colors group"
            >
              <div
                onClick={() => handleContactClick(contact.id)}
                className="flex-1 flex items-center gap-3 cursor-pointer"
              >
                {contact.avatarUrl ? (
                  <img src={contact.avatarUrl} alt={contact.fullName} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#4433FF]/20 flex items-center justify-center">
                    <User size={16} className="text-[#4433FF]" />
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold text-white">{contact.fullName}</div>
                  {contact.email && (
                    <div className="text-xs text-gray-500">{contact.email}</div>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRemoveContact(contact.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#1A1A1D] rounded"
              >
                <X size={14} className="text-gray-500 hover:text-red-500" />
              </button>
            </div>
          ))}
          {relatedContacts.length === 0 && !isAddingContact && (
            <p className="text-gray-600 text-sm italic">No related contacts</p>
          )}
        </div>
      </div>

      {/* Attachments */}
      <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Paperclip size={16} className="text-green-500" />
            <h3 className="text-sm font-bold text-white">ATTACHMENTS</h3>
            <span className="text-xs text-gray-500">({project.attachments.length})</span>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-[#4433FF] hover:bg-[#5544FF] text-white text-xs font-bold rounded transition-colors flex items-center gap-1"
            >
              <Plus size={12} />
              Upload File
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {project.attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 bg-[#1A1A1D] rounded hover:bg-[#252528] transition-colors group"
            >
              <File size={16} className="text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{attachment.fileName}</div>
                <div className="text-xs text-gray-500">
                  {new Date(attachment.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={attachment.dataUrl}
                  download={attachment.fileName}
                  className="p-1 hover:bg-[#1A1A1D] rounded transition-colors"
                  title="Download"
                >
                  <Download size={14} className="text-gray-500 hover:text-white" />
                </a>
                <button
                  onClick={() => handleRemoveAttachment(attachment.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#1A1A1D] rounded"
                >
                  <X size={14} className="text-gray-500 hover:text-red-500" />
                </button>
              </div>
            </div>
          ))}
          {project.attachments.length === 0 && (
            <p className="text-gray-600 text-sm italic">No attachments</p>
          )}
        </div>
      </div>

      {/* Frame Scan */}
      <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scan size={16} className="text-[#4433FF]" />
            <h3 className="text-sm font-bold text-white">FRAME SCAN</h3>
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-[#4433FF] to-[#6A82FC] hover:opacity-90 text-white text-xs font-bold rounded transition-opacity flex items-center gap-2">
            <Scan size={14} />
            Run Frame Scan
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Analyze this project's structure, tasks, and communications for authority leaks and optimization opportunities.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-white">PROJECT SECTIONS</h2>
          <button
            onClick={() => setIsAddingSection(true)}
            className="px-3 py-1.5 bg-[#4433FF] hover:bg-[#5544FF] text-white text-xs font-bold rounded transition-colors flex items-center gap-1"
          >
            <Plus size={12} />
            Add Section
          </button>
        </div>

        {/* Add Section Form */}
        {isAddingSection && (
          <div className="bg-[#0E0E0E] border border-[#4433FF] rounded-xl p-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Section name..."
                className="flex-1 bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSection();
                  if (e.key === 'Escape') {
                    setIsAddingSection(false);
                    setNewSectionName('');
                  }
                }}
              />
              <button
                onClick={handleAddSection}
                className="p-2 bg-[#4433FF] hover:bg-[#5544FF] rounded transition-colors"
              >
                <Check size={16} className="text-white" />
              </button>
              <button
                onClick={() => {
                  setIsAddingSection(false);
                  setNewSectionName('');
                }}
                className="p-2 bg-[#1A1A1D] hover:bg-[#252528] rounded transition-colors"
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>
          </div>
        )}

        {/* Section List */}
        {sections.map(section => (
          <ProjectSection
            key={section.id}
            section={section}
            projectId={projectId}
            onDelete={handleDeleteSection}
            selectedContactId={selectedContactId}
            setSelectedContactId={setSelectedContactId}
            onNavigateToDossier={onNavigateToDossier}
            primaryContactId={project.primaryContactId}
          />
        ))}

        {sections.length === 0 && !isAddingSection && (
          <div className="text-center py-12 text-gray-500 bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl">
            <p className="text-sm">No sections yet</p>
            <p className="text-xs mt-2">Add a section to organize tasks</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ProjectSection Component
interface ProjectSectionProps {
  section: ProjectSectionType;
  projectId: string;
  onDelete: (sectionId: string) => void;
  selectedContactId: string;
  setSelectedContactId: (id: string) => void;
  onNavigateToDossier?: () => void;
  primaryContactId: string;
}

const ProjectSection: React.FC<ProjectSectionProps> = ({
  section,
  projectId,
  onDelete,
  selectedContactId,
  setSelectedContactId,
  onNavigateToDossier,
  primaryContactId
}) => {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const taskLinks = getTaskLinksForSection(section.id);
  const tasks = taskLinks.map(link => getTaskById(link.taskId)).filter(Boolean) as Task[];

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    // Create the task in taskStore
    const task = createTask({
      contactId: primaryContactId,
      title: newTaskTitle,
      dueAt: newTaskDueDate || undefined
    });

    // Link it to this project section
    addTaskToProjectSection(task.id, projectId, section.id);

    setNewTaskTitle('');
    setNewTaskDueDate('');
    setIsAddingTask(false);
  };

  const handleToggleTaskStatus = (taskId: string, currentStatus: TaskStatus) => {
    const newStatus: TaskStatus = currentStatus === 'done' ? 'open' : 'done';
    updateTaskStatus(taskId, newStatus);
  };

  const handleRemoveTask = (taskId: string) => {
    if (confirm('Remove this task from the project?')) {
      removeTaskFromProject(projectId, taskId);
    }
  };

  return (
    <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl overflow-hidden">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#121212] border-b border-[#2A2A2A]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">{section.name}</h3>
          <span className="text-xs text-gray-500">({tasks.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddingTask(true)}
            className="p-1 hover:bg-[#1A1A1D] rounded transition-colors"
          >
            <Plus size={14} className="text-gray-500" />
          </button>
          <button
            onClick={() => onDelete(section.id)}
            className="p-1 hover:bg-[#1A1A1D] rounded transition-colors"
          >
            <Trash2 size={14} className="text-gray-500 hover:text-red-500" />
          </button>
        </div>
      </div>

      {/* Tasks */}
      <div className="p-4 space-y-2">
        {tasks.map(task => (
          <div
            key={task.id}
            className="flex items-center gap-3 p-3 bg-[#1A1A1D] rounded hover:bg-[#252528] transition-colors group"
          >
            <button
              onClick={() => handleToggleTaskStatus(task.id, task.status)}
              className="flex-shrink-0"
            >
              {task.status === 'done' ? (
                <CheckCircle size={16} className="text-green-500" />
              ) : (
                <Circle size={16} className="text-gray-500" />
              )}
            </button>
            <div className="flex-1">
              <div className={`text-sm ${task.status === 'done' ? 'text-gray-500 line-through' : 'text-white'}`}>
                {task.title}
              </div>
              {task.dueAt && (
                <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                  <CalendarIcon size={10} />
                  {new Date(task.dueAt).toLocaleDateString()}
                </div>
              )}
            </div>
            <button
              onClick={() => handleRemoveTask(task.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#1A1A1D] rounded"
            >
              <X size={14} className="text-gray-500 hover:text-red-500" />
            </button>
          </div>
        ))}

        {/* Add Task Form */}
        {isAddingTask && (
          <div className="p-3 bg-[#1A1A1D] border border-[#4433FF] rounded space-y-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task title..."
              className="w-full bg-[#0E0E0E] border border-[#333] rounded px-2 py-1.5 text-white text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTask();
                if (e.key === 'Escape') {
                  setIsAddingTask(false);
                  setNewTaskTitle('');
                  setNewTaskDueDate('');
                }
              }}
            />
            <div className="flex items-center gap-2">
              <DatePicker
                value={newTaskDueDate}
                onChange={setNewTaskDueDate}
                placeholder="Select due date..."
                className="flex-1"
              />
              <button
                onClick={handleAddTask}
                className="px-3 py-1.5 bg-[#4433FF] hover:bg-[#5544FF] text-white text-xs font-bold rounded transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAddingTask(false);
                  setNewTaskTitle('');
                  setNewTaskDueDate('');
                }}
                className="px-3 py-1.5 bg-[#1A1A1D] hover:bg-[#252528] text-gray-400 text-xs font-bold rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {tasks.length === 0 && !isAddingTask && (
          <div className="text-center py-6 text-gray-600 text-xs">
            No tasks in this section
          </div>
        )}
      </div>
    </div>
  );
};
