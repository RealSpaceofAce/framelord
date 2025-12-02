// =============================================================================
// CONTACT ZERO DASHBOARD — The user's own profile view
// =============================================================================

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, TrendingUp, TrendingDown, Minus,
  Activity, Zap, Calendar, FileText
} from 'lucide-react';
import { getContactZero, CONTACT_ZERO } from '../../services/contactStore';
import { getNotesByContactId } from '../../services/noteStore';
import { Contact, ContactZero } from '../../types';

const MotionDiv = motion.div as any;

/**
 * ContactZeroDashboard
 * 
 * The user's own profile and frame metrics.
 * This is "Contact Zero" — the canonical self-record in the Contact spine.
 */
export const ContactZeroDashboard: React.FC = () => {
  const user = getContactZero();
  const notes = getNotesByContactId(user.id);

  const trendIcon = () => {
    if (user.frame.trend === 'up') return <TrendingUp size={16} className="text-green-500" />;
    if (user.frame.trend === 'down') return <TrendingDown size={16} className="text-red-500" />;
    return <Minus size={16} className="text-gray-500" />;
  };

  const scoreColor = user.frame.currentScore >= 80 
    ? 'text-green-400' 
    : user.frame.currentScore >= 60 
      ? 'text-yellow-400' 
      : 'text-red-400';

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-[#4433FF] rounded-sm" />
          <h1 className="text-2xl font-display font-bold text-white tracking-wide">
            CONTACT ZERO
          </h1>
          <span className="text-[10px] bg-[#4433FF]/20 text-[#4433FF] px-2 py-0.5 rounded border border-[#4433FF]/30 font-bold uppercase">
            Identity Prime
          </span>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: Identity Card */}
        <div className="bg-[#0E0E0E] border border-[#4433FF]/30 rounded-xl p-6 shadow-[0_0_30px_rgba(68,51,255,0.1)]">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-4">
              <img 
                src={user.avatarUrl} 
                alt={user.fullName}
                className="w-28 h-28 rounded-full border-4 border-[#4433FF] shadow-[0_0_20px_rgba(68,51,255,0.3)]" 
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-[#0E0E0E] flex items-center justify-center">
                <Zap size={12} className="text-white" />
              </div>
            </div>
            
            <h2 className="text-2xl font-display font-bold text-white">{user.fullName}</h2>
            
            <p className="text-xs text-gray-500 mt-1 font-mono uppercase tracking-wider">
              {user.relationshipRole}
            </p>
          </div>

          <div className="space-y-3 border-t border-[#2A2A2A] pt-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Email</span>
              <span className="text-white font-mono text-xs">{user.email || '—'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Domain</span>
              <span className="text-[#4433FF] font-bold uppercase text-xs">{user.relationshipDomain}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Status</span>
              <span className="text-green-400 font-bold uppercase text-xs">{user.status}</span>
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
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Current Frame Score</h3>
            </div>
            <div className="flex items-end gap-4">
              <span className={`text-6xl font-display font-bold ${scoreColor}`}>
                {user.frame.currentScore}
              </span>
              <div className="flex items-center gap-1 mb-2">
                {trendIcon()}
                <span className="text-xs text-gray-400 uppercase">{user.frame.trend}</span>
              </div>
            </div>
            <div className="mt-4 h-2 bg-[#1A1A1D] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#4433FF] to-[#737AFF] transition-all duration-500"
                style={{ width: `${user.frame.currentScore}%` }}
              />
            </div>
          </MotionDiv>

          {/* Last Scan */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-green-500" />
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Last Frame Scan</h3>
            </div>
            <div className="text-2xl font-display font-bold text-white">
              {user.frame.lastScanAt 
                ? new Date(user.frame.lastScanAt).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })
                : 'Never'
              }
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Run a scan to update your frame metrics
            </div>
          </div>
        </div>

        {/* RIGHT: Tags & Activity */}
        <div className="space-y-6">
          {/* Tags */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-orange-500" />
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tags</h3>
            </div>
            {user.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.tags.map((tag) => (
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
                {notes.slice(0, 2).map((note) => (
                  <div 
                    key={note.id}
                    className="text-sm text-gray-400 line-clamp-2 border-l-2 border-[#4433FF]/30 pl-3"
                  >
                    {note.content}
                  </div>
                ))}
                {notes.length > 2 && (
                  <p className="text-xs text-gray-600">+{notes.length - 2} more notes</p>
                )}
              </div>
            ) : (
              <p className="text-gray-600 text-sm italic">No notes yet. Start journaling!</p>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM: Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-gray-600" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Notes</span>
          </div>
          <div className="text-3xl font-display font-bold text-white">{notes.length}</div>
          <div className="text-xs text-gray-600">journal entries</div>
        </div>

        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-gray-600" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Frame Score</span>
          </div>
          <div className={`text-3xl font-display font-bold ${scoreColor}`}>
            {user.frame.currentScore}
          </div>
          <div className="text-xs text-gray-600">current rating</div>
        </div>

        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-gray-600" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Trend</span>
          </div>
          <div className="text-3xl font-display font-bold text-white flex items-center gap-2">
            {trendIcon()}
            <span className="capitalize">{user.frame.trend}</span>
          </div>
          <div className="text-xs text-gray-600">momentum</div>
        </div>
      </div>
    </div>
  );
};
