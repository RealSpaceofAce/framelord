import React, { useState } from 'react';
import { Folder, Plus, Filter, User, Calendar as CalendarIcon, CheckCircle, AlertCircle, Clock, Trash2, Users } from 'lucide-react';
import type { Project, ProjectStatus, ProjectPriority } from '../../types';
import {
  getAllProjects,
  createProject,
  updateProject,
  archiveProject,
  getProjectTaskCount,
  getProjectOpenTaskCount
} from '../../services/projectStore';
import { getContactById, getContactsExcludingSelf, CONTACT_ZERO } from '../../services/contactStore';

interface ProjectsViewProps {
  selectedContactId: string;
  setSelectedContactId: (id: string) => void;
  onNavigateToDossier?: () => void;
  onNavigateToProject?: (projectId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  selectedContactId,
  setSelectedContactId,
  onNavigateToDossier,
  onNavigateToProject
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<ProjectPriority | 'all'>('all');

  // Form state
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectPriority, setNewProjectPriority] = useState<ProjectPriority>('medium');
  const [newProjectPrimaryContactId, setNewProjectPrimaryContactId] = useState(selectedContactId);
  const [newProjectIsGroup, setNewProjectIsGroup] = useState(false);
  const [newProjectGroupMembers, setNewProjectGroupMembers] = useState<string[]>([]);
  const [memberQuery, setMemberQuery] = useState('');

  const projects = getAllProjects();
  const availableContacts = getContactsExcludingSelf(true);

  // Filter projects
  const filteredProjects = projects.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterPriority !== 'all' && p.priority !== filterPriority) return false;
    return true;
  });

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const primaryContactId = newProjectPrimaryContactId || CONTACT_ZERO.id;

    const project = createProject({
      name: newProjectName,
      description: newProjectDescription,
      primaryContactId,
      priority: newProjectPriority,
      status: 'active',
      isGroupProject: newProjectIsGroup,
      groupMemberIds: newProjectIsGroup
        ? Array.from(new Set([...newProjectGroupMembers, primaryContactId]))
        : [],
    });

    setNewProjectName('');
    setNewProjectDescription('');
    setNewProjectPriority('medium');
    setNewProjectIsGroup(false);
    setNewProjectGroupMembers([]);
    setMemberQuery('');
    setIsCreating(false);

    // Navigate to project detail
    if (onNavigateToProject) {
      onNavigateToProject(project.id);
    }
  };

  const toggleGroupMember = (contactId: string) => {
    setNewProjectGroupMembers((prev) =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleProjectClick = (project: Project) => {
    if (onNavigateToProject) {
      onNavigateToProject(project.id);
    }
  };

  const handleContactClick = (contactId: string) => {
    setSelectedContactId(contactId);
    if (onNavigateToDossier) {
      onNavigateToDossier();
    }
  };

  const getStatusColor = (status: ProjectStatus): string => {
    switch (status) {
      case 'active': return 'text-green-500';
      case 'on_hold': return 'text-yellow-500';
      case 'completed': return 'text-blue-500';
      case 'archived': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  const getPriorityColor = (priority: ProjectPriority): string => {
    switch (priority) {
      case 'critical': return 'text-red-500 bg-red-500/10';
      case 'high': return 'text-orange-500 bg-orange-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      case 'low': return 'text-gray-500 bg-gray-500/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#4433FF]/20 rounded-lg flex items-center justify-center">
            <Folder size={20} className="text-[#4433FF]" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">PROJECTS</h1>
            <p className="text-xs text-gray-500 mt-1">Asana-style project management</p>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] text-white text-xs font-bold rounded transition-colors flex items-center gap-2"
        >
          <Plus size={14} />
          New Project
        </button>
      </div>

      {/* Create Project Form */}
      {isCreating && (
        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-sm font-bold text-white mb-4">CREATE PROJECT</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-2">Project Name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name..."
                className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">Description</label>
              <textarea
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Project description..."
                rows={3}
                className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-2">Priority</label>
                <select
                  value={newProjectPriority}
                  onChange={(e) => setNewProjectPriority(e.target.value as ProjectPriority)}
                  className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                id="project-group-toggle"
                type="checkbox"
                checked={newProjectIsGroup}
                onChange={(e) => {
                  const next = e.target.checked;
                  setNewProjectIsGroup(next);
                  if (next) {
                    setNewProjectGroupMembers((prev) => {
                      if (prev.includes(newProjectPrimaryContactId)) return prev;
                      return [...prev, newProjectPrimaryContactId];
                    });
                  }
                }}
                className="accent-[#4433FF]"
              />
              <label htmlFor="project-group-toggle" className="text-xs text-gray-400 select-none">
                Treat this project as a group workspace (add members + goals)
              </label>
            </div>

            {newProjectIsGroup && (
              <div className="bg-[#0F1018] border border-[#1F2028] rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] uppercase tracking-widest text-gray-500 flex items-center gap-1">
                    <Users size={12} /> Group Members
                  </div>
                  <span className="text-[11px] text-gray-500">
                    {newProjectGroupMembers.length} selected
                  </span>
                </div>
                <input
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  placeholder="Type to search contacts..."
                  className="w-full bg-[#0E0E0E] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
                />
                <div className="flex flex-wrap gap-2">
                  {newProjectGroupMembers.map(id => {
                    const contact = availableContacts.find(c => c.id === id);
                    if (!contact) return null;
                    return (
                      <span
                        key={id}
                        className="px-3 py-1 rounded-full text-xs border border-[#4433FF] bg-[#4433FF]/20 text-white flex items-center gap-2"
                      >
                        {contact.fullName}
                        <button
                          type="button"
                          onClick={() => toggleGroupMember(id)}
                          className="text-gray-300 hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                  {newProjectGroupMembers.length === 0 && (
                    <div className="text-xs text-gray-500">No members selected</div>
                  )}
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {availableContacts
                    .filter(c => c.fullName.toLowerCase().includes(memberQuery.trim().toLowerCase()))
                    .slice(0, 12)
                    .map(contact => {
                      const isSelected = newProjectGroupMembers.includes(contact.id);
                      return (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => toggleGroupMember(contact.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded border text-xs transition-colors ${
                            isSelected
                              ? 'border-[#4433FF] bg-[#4433FF]/10 text-white'
                              : 'border-[#333] text-gray-300 hover:border-[#4433FF]/50 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{contact.fullName}</span>
                          {isSelected && <span className="text-[10px] text-[#9AE6B4]">Added</span>}
                        </button>
                      );
                    })}
                  {availableContacts.filter(c => c.fullName.toLowerCase().includes(memberQuery.trim().toLowerCase())).length === 0 && (
                    <div className="text-xs text-gray-500 px-1">No matches</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-[#2A2A2A]">
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 bg-[#1A1A1D] hover:bg-[#252528] text-gray-400 text-xs font-bold rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] text-white text-xs font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-500" />
          <span className="text-xs text-gray-500">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ProjectStatus | 'all')}
            className="bg-[#1A1A1D] border border-[#333] rounded px-2 py-1 text-white text-xs"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Priority:</span>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as ProjectPriority | 'all')}
            className="bg-[#1A1A1D] border border-[#333] rounded px-2 py-1 text-white text-xs"
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="ml-auto text-xs text-gray-500">
          {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map(project => {
          const contact = getContactById(project.primaryContactId);
          const totalTasks = getProjectTaskCount(project.id);
          const openTasks = getProjectOpenTaskCount(project.id);
          const groupMembers = (project.groupMemberIds || []).map(id => getContactById(id)).filter(Boolean);

          return (
            <div
              key={project.id}
              onClick={() => handleProjectClick(project)}
              className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6 hover:border-[#4433FF] transition-all cursor-pointer group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-white font-bold text-sm group-hover:text-[#4433FF] transition-colors">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {project.isGroupProject && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-[#1A1A1D] text-[#9AE6B4] flex items-center gap-1 border border-[#2F3A2F]">
                      <Users size={10} /> GROUP
                    </span>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${getPriorityColor(project.priority)}`}>
                    {project.priority.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Contact */}
              {contact && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContactClick(contact.id);
                  }}
                  className="flex items-center gap-2 mb-4 p-2 bg-[#1A1A1D] rounded hover:bg-[#252528] transition-colors"
                >
                  {contact.avatarUrl ? (
                    <img src={contact.avatarUrl} alt={contact.fullName} className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#4433FF]/20 flex items-center justify-center">
                      <User size={12} className="text-[#4433FF]" />
                    </div>
                  )}
                  <span className="text-xs text-gray-400">{contact.fullName}</span>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <CheckCircle size={12} className={getStatusColor(project.status)} />
                  <span className="capitalize">{project.status.replace('_', ' ')}</span>
                </div>

                <div className="flex items-center gap-1">
                  <AlertCircle size={12} />
                  <span>{openTasks}/{totalTasks} tasks</span>
                </div>

                {project.isGroupProject && (
                  <div className="flex items-center gap-1">
                    <Users size={12} />
                    <span>{groupMembers.length} member{groupMembers.length === 1 ? '' : 's'}</span>
                  </div>
                )}
              </div>

              {/* Dates */}
              {(project.startDate || project.dueDate) && (
                <div className="text-xs text-gray-600 space-y-1">
                  {project.startDate && (
                    <div className="flex items-center gap-1">
                      <CalendarIcon size={10} />
                      <span>Started: {project.startDate}</span>
                    </div>
                  )}
                  {project.dueDate && (
                    <div className="flex items-center gap-1">
                      <Clock size={10} />
                      <span>Due: {project.dueDate}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Folder size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-sm">No projects found</p>
          <p className="text-xs mt-2">Create your first project to get started</p>
        </div>
      )}
    </div>
  );
};
