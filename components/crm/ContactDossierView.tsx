// =============================================================================
// CONTACT DOSSIER VIEW — Detailed profile for any contact
// =============================================================================
// This component works for ANY contact, not just Contact Zero.
// It receives selectedContactId as a prop and renders that contact's details.
// =============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Target, TrendingUp, TrendingDown, Minus,
  Activity, Zap, Calendar, FileText, Mail, Phone,
  Tag, Clock
} from 'lucide-react';
import { getContactById, CONTACT_ZERO } from '../../services/contactStore';
import { getNotesByContactId } from '../../services/noteStore';
import { Contact } from '../../types';

const MotionDiv = motion.div as any;

// --- PROPS ---

interface ContactDossierViewProps {
  selectedContactId: string;
}

// --- COMPONENT ---

export const ContactDossierView: React.FC<ContactDossierViewProps> = ({ selectedContactId }) => {
  // Get contact from store
  const contact = getContactById(selectedContactId);
  
  // Fallback if contact not found (shouldn't happen)
  if (!contact) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Contact not found</p>
      </div>
    );
  }

  const isContactZero = contact.id === CONTACT_ZERO.id;
  const notes = getNotesByContactId(contact.id);

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
              {contact.status === 'active' && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-[#0E0E0E] flex items-center justify-center">
                  <Zap size={12} className="text-white" />
                </div>
              )}
            </div>
            
            <h2 className="text-2xl font-display font-bold text-white">{contact.fullName}</h2>
            
            <p className="text-xs text-gray-500 mt-1 font-mono uppercase tracking-wider">
              {contact.relationshipRole}
            </p>

            {/* Domain & Status Badges */}
            <div className="flex gap-2 mt-3">
              <span className={`text-[10px] px-2 py-1 rounded uppercase font-bold ${domainColor(contact.relationshipDomain)}`}>
                {contact.relationshipDomain}
              </span>
              <span className={`text-[10px] px-2 py-1 rounded border uppercase font-bold ${statusColor(contact.status)}`}>
                {contact.status}
              </span>
            </div>
          </div>

          <div className="space-y-3 border-t border-[#2A2A2A] pt-4">
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
        </div>

        {/* RIGHT: Tags & Notes */}
        <div className="space-y-6">
          {/* Tags */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Tag size={16} className="text-orange-500" />
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tags</h3>
            </div>
            {contact.tags.length > 0 ? (
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

          {/* Recent Notes Preview */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-[#4433FF]" />
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Recent Notes</h3>
            </div>
            {notes.length > 0 ? (
              <div className="space-y-3">
                {notes.slice(0, 3).map((note) => (
                  <div 
                    key={note.id}
                    className="border-l-2 border-[#4433FF]/30 pl-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={10} className="text-gray-600" />
                      <span className="text-[10px] text-gray-500">
                        {new Date(note.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {note.content}
                    </p>
                  </div>
                ))}
                {notes.length > 3 && (
                  <p className="text-xs text-gray-600">+{notes.length - 3} more notes</p>
                )}
              </div>
            ) : (
              <p className="text-gray-600 text-sm italic">No notes yet</p>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM: Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className="text-gray-600" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Notes</span>
          </div>
          <div className="text-3xl font-display font-bold text-white">{notes.length}</div>
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

