
import React, { useState } from 'react';
import { Contact } from '../../types';
import { getContacts, getContactById, createContact, updateContact, appendNoteToEntity } from '../../services/crmService';
import { User, Phone, Mail, Linkedin, MapPin, Briefcase, Activity, Target, Plus, X, Save, Edit2, Globe, Instagram, Facebook, Twitter, Youtube, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

export const ContactsView: React.FC = () => {
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    
    // Sort contacts: Self first, then others
    const contacts = getContacts().sort((a, b) => (a.isSelf ? -1 : b.isSelf ? 1 : 0));

    return (
        <div className="h-full flex flex-col relative">
            {!selectedContact ? (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-display font-bold text-white">DIRECTORY</h2>
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] text-white rounded text-xs font-bold transition-colors"
                        >
                            <Plus size={16} /> ADD CONTACT
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {contacts.map(contact => (
                            <div 
                                key={contact.id} 
                                onClick={() => setSelectedContact(contact)}
                                className={`bg-[#0E0E0E] border rounded-lg p-5 transition-all cursor-pointer group ${contact.isSelf ? 'border-[#4433FF] bg-[#4433FF]/10 shadow-[0_0_20px_rgba(68,51,255,0.15)]' : 'border-[#2A2A2A] hover:border-[#4433FF] hover:bg-[#121214]'}`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-full overflow-hidden border ${contact.isSelf ? 'border-[#4433FF]' : 'border-[#333]'}`}>
                                            <img src={contact.identity.avatarUrl} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-white font-bold font-display tracking-wide">{contact.identity.name}</h3>
                                                {contact.isSelf && <span className="bg-[#4433FF] text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">IDENTITY PRIME</span>}
                                            </div>
                                            <p className="text-xs text-gray-500 font-mono">{contact.classification.type}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-xl font-display font-bold ${contact.pipeline.score >= 75 ? 'text-green-500' : 'text-orange-500'}`}>
                                            {contact.pipeline.score}
                                        </div>
                                        <div className="text-[9px] text-gray-600 uppercase">{contact.pipeline.trend}</div>
                                    </div>
                                </div>
                                
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <Target size={12} className="text-[#4433FF]" />
                                        <span className="truncate">{contact.goals.topGoal || 'No primary objective'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <Activity size={12} className="text-gray-600" />
                                        <span>Stage: <span className="text-white">{contact.pipeline.stage}</span></span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <ContactDossier 
                    contact={selectedContact} 
                    onBack={() => setSelectedContact(null)} 
                />
            )}

            {/* CREATE MODAL simplified */}
        </div>
    );
};

const ContactDossier: React.FC<{ contact: Contact, onBack: () => void }> = ({ contact: initialContact, onBack }) => {
    // FORCE REFRESH: Always pull the latest version of the contact from the service
    const contact = getContactById(initialContact.id) || initialContact;
    const [noteInput, setNoteInput] = useState('');
    const [refresh, setRefresh] = useState(0);

    const handleNoteSubmit = () => {
        if (!noteInput.trim()) return;
        appendNoteToEntity(contact.id, 'Contact', noteInput);
        setNoteInput('');
        setRefresh(p => p+1); // Force re-render to show new note
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleNoteSubmit();
        }
    };

    return (
        <div className="h-full flex flex-col gap-6 relative pb-20">
            <div className="flex justify-between items-center">
                <button onClick={onBack} className="text-xs text-gray-500 hover:text-white uppercase tracking-wider flex items-center gap-2 w-fit">
                    ← Back to Directory
                </button>
                <div className="text-xl font-display font-bold text-white flex items-center gap-2">
                    {contact.identity.name}
                    {contact.isSelf && <span className="text-[#4433FF] text-xs border border-[#4433FF] px-2 py-0.5 rounded">CONTACT ZERO</span>}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                {/* IDENTITY */}
                <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6 h-fit">
                    <div className="flex flex-col items-center text-center mb-6">
                        <img src={contact.identity.avatarUrl} className="w-24 h-24 rounded-full border-2 border-[#4433FF] mb-4" />
                        <div className="px-2 py-0.5 bg-[#4433FF]/20 text-[#4433FF] text-[10px] font-bold uppercase rounded border border-[#4433FF]/30">{contact.classification.type}</div>
                    </div>
                    
                    <div className="space-y-3 text-sm text-gray-400 border-t border-[#2A2A2A] pt-4">
                        <div className="flex justify-between">
                            <span>Email</span> <span className="text-white">{contact.contactInfo.email}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Phone</span> <span className="text-white">{contact.contactInfo.phone}</span>
                        </div>
                        <div className="pt-2">
                            <span className="block text-[10px] uppercase text-gray-600 mb-1">Context</span>
                            <p className="text-xs italic">{contact.classification.roleDescription}</p>
                        </div>
                    </div>
                </div>

                {/* WORKFLOW */}
                <div className="lg:col-span-2 space-y-6 flex flex-col">
                    <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
                        <h3 className="text-xs font-bold text-[#4433FF] uppercase tracking-widest mb-4">Pipeline Status</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 bg-[#1A1A1D] h-2 rounded-full overflow-hidden">
                                <div className="h-full bg-[#4433FF]" style={{ width: `${contact.pipeline.score}%` }} />
                            </div>
                            <span className="font-bold text-white">{contact.pipeline.score}/100</span>
                        </div>
                        <div className="mt-4 flex gap-4 text-xs text-gray-400">
                            <div>Stage: <span className="text-white font-bold">{contact.pipeline.stage}</span></div>
                            <div>Trend: <span className="text-white font-bold">{contact.pipeline.trend}</span></div>
                        </div>
                    </div>

                    {/* NOTES FEED */}
                    <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6 flex flex-col flex-grow min-h-[400px]">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Interaction Log</h3>
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 bg-[#121212] rounded p-4 border border-[#333]">
                            {contact.notes.length === 0 && <div className="text-gray-600 text-xs italic">No interactions recorded.</div>}
                            {contact.notes.map((note) => (
                                <div key={note.id} className="text-sm text-gray-300 border-l-2 border-gray-600 pl-3">
                                    <div className="text-[10px] text-gray-500 mb-1">{note.dateStr}</div>
                                    <p className="whitespace-pre-wrap">{note.content}</p>
                                </div>
                            ))}
                        </div>
                        <textarea
                            className="w-full bg-[#1A1A1D] border border-[#333] rounded p-3 text-white text-sm focus:border-[#4433FF] outline-none resize-none"
                            placeholder="Add interaction note... (Shift+Enter for newline, Enter to submit)"
                            value={noteInput}
                            onChange={e => setNoteInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={2}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
