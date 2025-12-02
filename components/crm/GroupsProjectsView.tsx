

import React, { useState, useRef, useEffect } from 'react';
import { getGroups, getProjects, getContactById, addGroup, addProject, getContacts, updateGroup, updateProject, addActionToEntity, toggleEntityAction, addFileToEntity, processLittleLordCommand, getPipelines } from '../../services/crmService';
import { Group, Project, Contact, ChatMessage, ActionItem, FileAttachment, Pipeline } from '../../types';
import { Users, Folder, TrendingUp, Calendar, Zap, Plus, X, Image as ImageIcon, Camera, Scan, ArrowLeft, Settings, Clock, FileText, CheckSquare, Paperclip, Bot, Send, Trash2, Download, GripVertical, GitCommit, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeFrame } from '../../services/geminiService';

const MotionDiv = motion.div as any;

export const GroupsProjectsView: React.FC = () => {
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [createType, setCreateType] = useState<'group' | 'project' | null>(null);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    const handleCreate = () => {
        if (!newName.trim()) return;
        
        if (createType === 'group') {
            addGroup({ name: newName, description: newDesc, contactIds: [] });
        } else {
            addProject({ name: newName, description: newDesc, contactIds: [], status: 'active' });
        }
        
        setCreateType(null);
        setNewName('');
        setNewDesc('');
        setRefreshKey(p => p + 1);
    }

    if (selectedGroup) {
        return (
            <GroupDetailView 
                group={selectedGroup} 
                onBack={() => setSelectedGroup(null)} 
                onUpdate={() => setRefreshKey(p => p+1)} 
            />
        );
    }

    if (selectedProject) {
        return (
            <ProjectDetailView 
                project={selectedProject} 
                onBack={() => setSelectedProject(null)} 
                onUpdate={() => setRefreshKey(p => p+1)} 
            />
        );
    }

    return (
        <div className="space-y-12 relative pb-20">
            {/* GROUPS SECTION */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Users size={24} className="text-[#4433FF]" />
                        <h2 className="text-xl font-display font-bold text-white">ACTIVE GROUPS</h2>
                    </div>
                    <button 
                        onClick={() => setCreateType('group')}
                        className="px-3 py-1.5 bg-[#1A1A1D] border border-[#333] hover:border-[#4433FF] text-xs font-bold text-white rounded transition-colors flex items-center gap-2"
                    >
                        <Plus size={14} /> NEW GROUP
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {getGroups().map(g => (
                        <div 
                            key={g.id} 
                            onClick={() => setSelectedGroup(g)}
                            className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6 hover:border-[#4433FF] transition-colors cursor-pointer group relative overflow-hidden"
                        >
                            {g.bannerUrl && (
                                <div className="absolute top-0 left-0 w-full h-24 opacity-20 transition-opacity group-hover:opacity-40">
                                    <img src={g.bannerUrl} className="w-full h-full object-cover" alt="banner" />
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0E0E0E]" />
                                </div>
                            )}
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{g.name}</h3>
                                        <p className="text-xs text-gray-500">{g.description}</p>
                                    </div>
                                    <div className="bg-[#121212] px-3 py-1 rounded border border-[#333]">
                                        <div className="text-[9px] text-gray-600 uppercase">Frame Avg</div>
                                        <div className="text-lg font-bold text-[#4433FF]">{g.frameScore}</div>
                                    </div>
                                </div>
                                <div className="flex items-center -space-x-2">
                                    {g.contactIds.map(cid => {
                                        const c = getContactById(cid);
                                        if (!c) return null;
                                        return (
                                            <img key={cid} src={c.identity.avatarUrl} title={c.identity.name} className="w-8 h-8 rounded-full border-2 border-[#0E0E0E]" />
                                        )
                                    })}
                                    <div className="w-8 h-8 rounded-full border-2 border-[#0E0E0E] bg-[#222] flex items-center justify-center text-[10px] text-gray-400 font-bold">+</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* PROJECTS SECTION */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Folder size={24} className="text-green-500" />
                        <h2 className="text-xl font-display font-bold text-white">MISSION LOG</h2>
                    </div>
                    <button 
                        onClick={() => setCreateType('project')}
                        className="px-3 py-1.5 bg-[#1A1A1D] border border-[#333] hover:border-green-500 text-xs font-bold text-white rounded transition-colors flex items-center gap-2"
                    >
                        <Plus size={14} /> NEW PROJECT
                    </button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    {getProjects().map(p => (
                        <div 
                            key={p.id} 
                            onClick={() => setSelectedProject(p)}
                            className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6 flex flex-col md:flex-row items-center gap-6 hover:bg-[#121214] transition-colors cursor-pointer relative overflow-hidden"
                        >
                             {p.bannerUrl && (
                                <div className="absolute top-0 left-0 w-full h-full opacity-10">
                                    <img src={p.bannerUrl} className="w-full h-full object-cover" alt="banner" />
                                </div>
                            )}
                            <div className="flex-1 relative z-10">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-white font-bold tracking-wide">{p.name}</h3>
                                    <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded border border-green-800 uppercase font-bold">{p.status}</span>
                                </div>
                                <p className="text-sm text-gray-500">{p.description}</p>
                            </div>
                            
                            <div className="flex gap-8 relative z-10">
                                <div className="text-right">
                                    <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Health</div>
                                    <div className="flex items-center gap-2">
                                        <Zap size={14} className="text-green-500" />
                                        <span className="text-xl font-display font-bold text-white">{p.frameScore || 0}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Last Scan</div>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-gray-500" />
                                        <span className="text-sm font-mono text-gray-400">{new Date(p.lastScanAt || Date.now()).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CREATE MODAL */}
            <AnimatePresence>
                {createType && (
                    <>
                        <MotionDiv 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40"
                            onClick={() => setCreateType(null)}
                        />
                        <MotionDiv 
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-[#121212] border border-[#333] rounded-xl p-6 z-50 shadow-2xl"
                        >
                            <h3 className="text-lg font-display font-bold text-white mb-6 uppercase">CREATE {createType}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Name</label>
                                    <input 
                                        autoFocus
                                        className="w-full bg-[#1A1A1D] border border-[#333] rounded p-2 text-white outline-none focus:border-[#4433FF]"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Description</label>
                                    <textarea 
                                        className="w-full bg-[#1A1A1D] border border-[#333] rounded p-2 text-white outline-none focus:border-[#4433FF] h-20 resize-none"
                                        value={newDesc}
                                        onChange={e => setNewDesc(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={handleCreate}
                                    className="w-full py-3 bg-[#4433FF] hover:bg-[#5544FF] text-white font-bold uppercase rounded transition-colors mt-2"
                                >
                                    INITIALIZE
                                </button>
                            </div>
                        </MotionDiv>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

// ============================================================================
// GROUP DETAIL VIEW
// ============================================================================

const GroupDetailView: React.FC<{ group: Group, onBack: () => void, onUpdate: () => void }> = ({ group: initialGroup, onBack, onUpdate }) => {
    // Refresh group data on render to get latest notes
    const group = getGroups().find(g => g.id === initialGroup.id) || initialGroup;
    
    // Member Management
    const memberIds = group.contactIds;
    const members = memberIds.map(id => getContactById(id)).filter(Boolean) as Contact[];
    const allContacts = getContacts();
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

    // AI Chat State
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
        role: 'ai', 
        content: `Little Lord connected to ${group.name}. Analyzing frame dynamics.`, 
        timestamp: Date.now()
    }]);
    const [chatInput, setChatInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const handleBannerUpdate = () => {
        const url = prompt("Enter Image URL for Banner:");
        if (url) {
            updateGroup(group.id, { bannerUrl: url });
            onUpdate();
        }
    };

    const handleAddMember = (contactId: string) => {
        const newMembers = [...memberIds, contactId];
        updateGroup(group.id, { contactIds: newMembers });
        setIsMemberModalOpen(false);
        onUpdate();
    };

    const handleRemoveMember = (contactId: string) => {
        const newMembers = memberIds.filter(id => id !== contactId);
        updateGroup(group.id, { contactIds: newMembers });
        onUpdate();
    };

    const handleChatSend = async () => {
        if (!chatInput.trim()) return;
        const msg: ChatMessage = { role: 'user', content: chatInput, timestamp: Date.now() };
        setChatMessages(p => [...p, msg]);
        setChatInput('');
        setIsTyping(true);

        try {
            const response = await processLittleLordCommand(group.id, 'group', msg.content);
            setChatMessages(p => [...p, { role: 'ai', content: response, timestamp: Date.now() }]);
            onUpdate(); 
        } catch (e) {
            console.error(e);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="relative min-h-screen pb-20">
            {/* HERO BANNER */}
            <div className="h-48 w-full rounded-xl relative overflow-hidden group mb-4 bg-[#1A1A1D]">
                {group.bannerUrl ? (
                    <img src={group.bannerUrl} className="w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-700">
                        <ImageIcon size={48} />
                    </div>
                )}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                <button 
                    onClick={handleBannerUpdate}
                    className="absolute top-4 right-4 bg-black/60 p-2 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#4433FF]"
                >
                    <Camera size={16} />
                </button>
                <button onClick={onBack} className="absolute top-4 left-4 bg-black/60 px-3 py-1.5 rounded text-white flex items-center gap-2 hover:bg-white/20 text-xs font-bold uppercase tracking-wider">
                    <ArrowLeft size={14} /> Back
                </button>
                <div className="absolute bottom-6 left-6">
                    <div className="text-xs font-bold text-white/60 uppercase tracking-[0.2em] mb-1">GROUP DOSSIER</div>
                    <h1 className="text-4xl font-display font-bold text-white">{group.name}</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT: LITTLE LORD & NOTES */}
                <div className="lg:col-span-2 space-y-6">
                    {/* LITTLE LORD AI */}
                    <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl flex flex-col h-[400px] overflow-hidden relative">
                        <div className="p-4 border-b border-[#333] bg-[#121212] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bot size={16} className="text-[#4433FF]" />
                                <span className="text-xs font-bold text-white uppercase">SYSTEM AI: LITTLE LORD</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm bg-[#0A0A0A]">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded ${msg.role === 'user' ? 'bg-[#4433FF]/20 text-white border border-[#4433FF]/40' : 'bg-[#1A1A1D] text-[#DBDBDB] border border-[#333]'}`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isTyping && <div className="text-xs text-gray-500 italic">Little Lord is analyzing...</div>}
                        </div>
                        <div className="p-4 border-t border-[#333] bg-[#121212] flex gap-2">
                            <input 
                                className="flex-1 bg-[#0A0A0A] border border-[#333] rounded p-2 text-white outline-none focus:border-[#4433FF] font-mono text-sm"
                                placeholder="Command the AI..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                            />
                            <button onClick={handleChatSend} className="bg-[#4433FF] hover:bg-[#5544FF] text-white p-2 rounded"><Send size={16} /></button>
                        </div>
                    </div>

                    {/* NOTES (Static for Groups) */}
                    <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6 h-64 flex flex-col">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Strategic Notes</h3>
                        <textarea 
                            className="w-full h-full bg-[#121212] border border-[#333] rounded p-4 text-white text-sm focus:border-[#4433FF] outline-none resize-none"
                            value={group.notes || ''}
                            onChange={(e) => {
                                updateGroup(group.id, { notes: e.target.value });
                                onUpdate();
                            }}
                            placeholder="Start typing notes..."
                        />
                    </div>
                </div>

                {/* RIGHT: MEMBERS & INFO */}
                <div className="space-y-6">
                    {/* INFO */}
                    <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Collective Frame</h3>
                            <Settings size={14} className="text-gray-600 cursor-pointer" />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-5xl font-display font-bold text-[#4433FF]">{group.frameScore}</div>
                            <div className="text-xs text-gray-400">
                                Last scan: <br />
                                <span className="text-white font-mono">{group.lastScanAt ? new Date(group.lastScanAt).toLocaleDateString() : 'NEVER'}</span>
                            </div>
                        </div>
                    </div>

                    {/* MEMBERS */}
                    <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <Users size={14} /> Members
                            </h3>
                            <button 
                                onClick={() => setIsMemberModalOpen(true)}
                                className="text-xs text-[#4433FF] font-bold hover:text-white"
                            >
                                + ADD MEMBER
                            </button>
                        </div>
                        {members.length > 0 ? (
                            <div className="space-y-3">
                                {members.map(m => (
                                    <div key={m.id} className="flex items-center gap-3 bg-[#121212] p-2 rounded border border-[#333] group">
                                        <img src={m.identity.avatarUrl} className="w-8 h-8 rounded-full" />
                                        <div className="flex-1">
                                            <div className="text-xs font-bold text-white">{m.identity.name}</div>
                                            <div className="text-[9px] text-gray-500 uppercase">{m.classification.type}</div>
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveMember(m.id)}
                                            className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-600 italic">No members assigned yet.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* ADD MEMBER MODAL */}
            <AnimatePresence>
                {isMemberModalOpen && (
                    <>
                        <MotionDiv initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/80 z-40" onClick={() => setIsMemberModalOpen(false)} />
                        <MotionDiv initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} className="absolute bottom-0 left-0 right-0 h-[60vh] bg-[#121212] border-t border-[#2A2A2A] z-50 rounded-t-2xl p-6 flex flex-col shadow-2xl">
                            <h3 className="text-lg font-bold text-white mb-4">ADD MEMBER</h3>
                            <div className="overflow-y-auto space-y-2 flex-1">
                                {allContacts.filter(c => !memberIds.includes(c.id)).map(c => (
                                    <div key={c.id} onClick={() => handleAddMember(c.id)} className="flex items-center gap-3 p-3 hover:bg-[#1A1A1D] rounded cursor-pointer border border-transparent hover:border-[#333]">
                                        <img src={c.identity.avatarUrl} className="w-8 h-8 rounded-full" />
                                        <span className="text-white font-bold text-sm">{c.identity.name}</span>
                                        <span className="text-xs text-gray-500 ml-auto">{c.classification.domain}</span>
                                    </div>
                                ))}
                            </div>
                        </MotionDiv>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

// ============================================================================
// PROJECT DETAIL VIEW (DRAGGABLE LAYOUT)
// ============================================================================

const ProjectDetailView: React.FC<{ project: Project, onBack: () => void, onUpdate: () => void }> = ({ project: initialProject, onBack, onUpdate }) => {
    // Fetch latest project data to ensure notes/actions are fresh
    const project = getProjects().find(p => p.id === initialProject.id) || initialProject;
    
    // Layout State
    // Default layout order if not set
    const [layout, setLayout] = useState<string[]>(project.layoutOrder || ['notes', 'actions', 'files']);
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const pipelines = getPipelines();

    const handleBannerUpdate = () => {
        const url = prompt("Enter Image URL for Banner:");
        if (url) {
            updateProject(project.id, { bannerUrl: url });
            onUpdate();
        }
    };

    const handleDragStart = (e: React.DragEvent, item: string) => {
        setDraggedItem(item);
        e.dataTransfer.setData('text/plain', item);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetItem: string) => {
        e.preventDefault();
        const item = e.dataTransfer.getData('text/plain');
        if (item && item !== targetItem) {
            const newLayout = [...layout];
            const oldIdx = newLayout.indexOf(item);
            const newIdx = newLayout.indexOf(targetItem);
            newLayout.splice(oldIdx, 1);
            newLayout.splice(newIdx, 0, item);
            setLayout(newLayout);
            updateProject(project.id, { layoutOrder: newLayout });
        }
        setDraggedItem(null);
    };

    const handleLinkPipeline = () => {
        const pId = prompt("Enter Pipeline ID (e.g. p1, p2):");
        if (pId) {
            // Validate ID exists
            const p = pipelines.find(pl => pl.id === pId);
            if (p) {
                updateProject(project.id, { linkedPipelineId: pId });
                if (!layout.includes('pipeline')) {
                    const newLayout = [...layout, 'pipeline'];
                    setLayout(newLayout);
                    updateProject(project.id, { layoutOrder: newLayout });
                }
                onUpdate();
            } else {
                alert("Invalid Pipeline ID");
            }
        }
    }

    const renderWidget = (type: string) => {
        switch (type) {
            case 'notes':
                return (
                    <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6 h-96 flex flex-col group">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <GripVertical size={14} className="cursor-grab text-gray-700 hover:text-white" /> Strategic Notes
                            </h3>
                        </div>
                        <textarea 
                            className="w-full h-full bg-[#121212] border border-[#333] rounded p-4 text-white text-sm focus:border-[#4433FF] outline-none resize-none"
                            value={project.notes || ''}
                            onChange={(e) => {
                                updateProject(project.id, { notes: e.target.value });
                                onUpdate();
                            }}
                            placeholder="Type project notes..."
                        />
                    </div>
                );
            case 'actions':
                return (
                    <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6 h-fit group">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <GripVertical size={14} className="cursor-grab text-gray-700 hover:text-white" /> Actions
                            </h3>
                            <button onClick={() => {
                                const text = prompt("Action item:");
                                if(text) { addActionToEntity(project.id, 'project', text); onUpdate(); }
                            }} className="text-[#4433FF] text-xs font-bold flex items-center gap-1"><Plus size={14} /> Add</button>
                        </div>
                        <div className="space-y-2">
                            {project.actions?.map(a => (
                                <div key={a.id} className="flex items-center gap-3 p-3 bg-[#121212] border border-[#333] rounded hover:border-gray-600 cursor-pointer" onClick={() => { toggleEntityAction(project.id, 'project', a.id); onUpdate(); }}>
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${a.isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}>
                                        {a.isCompleted && <CheckSquare size={12} className="text-white" />}
                                    </div>
                                    <span className={`text-sm ${a.isCompleted ? 'text-gray-500 line-through' : 'text-white'}`}>{a.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'files':
                return (
                    <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6 h-fit group">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <GripVertical size={14} className="cursor-grab text-gray-700 hover:text-white" /> Files
                            </h3>
                            <button onClick={() => {
                                const name = prompt("Mock File Name:");
                                if(name) { addFileToEntity(project.id, 'project', name); onUpdate(); }
                            }} className="text-[#4433FF] text-xs font-bold flex items-center gap-1"><Plus size={14} /> Upload</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {project.files?.map(f => (
                                <div key={f.id} className="p-4 bg-[#121212] border border-[#333] rounded flex items-start justify-between group/file">
                                    <div className="flex items-center gap-3">
                                        <FileText className="text-gray-500" size={20} />
                                        <div className="text-sm font-bold text-white truncate max-w-[100px]">{f.name}</div>
                                    </div>
                                    <Download size={14} className="text-gray-600 hover:text-white cursor-pointer opacity-0 group-hover/file:opacity-100" />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'pipeline':
                // Only render if pipeline ID is linked
                const pipeline = project.linkedPipelineId ? pipelines.find(p => p.id === project.linkedPipelineId) : null;
                return (
                    <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6 h-fit group">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <GripVertical size={14} className="cursor-grab text-gray-700 hover:text-white" /> Pipeline: {pipeline?.name || 'Linked Board'}
                            </h3>
                            {!pipeline && (
                                <button onClick={handleLinkPipeline} className="text-[#4433FF] text-xs font-bold">Link Pipeline</button>
                            )}
                        </div>
                        {pipeline ? (
                            <div className="h-64 flex items-center justify-center bg-[#121212] border border-[#333] rounded text-gray-500 text-sm">
                                [Kanban Board: {pipeline.name} Visualization]
                            </div>
                        ) : (
                            <div className="text-gray-600 text-sm italic">No pipeline linked. Click to link.</div>
                        )}
                    </div>
                );
            default: return null;
        }
    }

    return (
        <div className="relative min-h-screen pb-20">
            {/* HERO BANNER */}
            <div className="h-48 w-full rounded-xl relative overflow-hidden group mb-4 bg-[#1A1A1D]">
                {project.bannerUrl ? (
                    <img src={project.bannerUrl} className="w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-700">
                        <ImageIcon size={48} />
                    </div>
                )}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                <button 
                    onClick={handleBannerUpdate}
                    className="absolute top-4 right-4 bg-black/60 p-2 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#4433FF]"
                >
                    <Camera size={16} />
                </button>
                <button onClick={onBack} className="absolute top-4 left-4 bg-black/60 px-3 py-1.5 rounded text-white flex items-center gap-2 hover:bg-white/20 text-xs font-bold uppercase tracking-wider">
                    <ArrowLeft size={14} /> Back
                </button>
                <div className="absolute bottom-6 left-6">
                    <div className="text-xs font-bold text-white/60 uppercase tracking-[0.2em] mb-1">PROJECT MISSION</div>
                    <h1 className="text-4xl font-display font-bold text-white">{project.name}</h1>
                </div>
            </div>

            {/* DRAGGABLE LAYOUT */}
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex justify-end mb-4 gap-2">
                    <button onClick={handleLinkPipeline} className="text-xs bg-[#1A1A1D] border border-[#333] px-3 py-1.5 rounded text-white flex items-center gap-2 hover:border-[#4433FF]">
                        <GitCommit size={14} /> {project.linkedPipelineId ? 'Change Pipeline' : 'Add Pipeline'}
                    </button>
                    <button onClick={() => {
                        if (!layout.includes('actions')) setLayout([...layout, 'actions']);
                        if (!layout.includes('files')) setLayout([...layout, 'files']);
                        if (!layout.includes('notes')) setLayout([...layout, 'notes']);
                        updateProject(project.id, { layoutOrder: layout });
                    }} className="text-xs bg-[#1A1A1D] border border-[#333] px-3 py-1.5 rounded text-white flex items-center gap-2 hover:border-[#4433FF]">
                        <Layout size={14} /> Reset Layout
                    </button>
                </div>

                {layout.map(item => (
                    <div 
                        key={item}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, item)}
                        className={`transition-all ${draggedItem === item ? 'opacity-50' : 'opacity-100'}`}
                    >
                        {renderWidget(item)}
                    </div>
                ))}
            </div>
        </div>
    );
};
