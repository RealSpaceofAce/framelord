import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Target, TrendingUp, TrendingDown, Minus,
  Activity, Zap, Calendar, Edit2, Save, X
} from 'lucide-react';
import { getContactZero, updateContact } from '../../services/crmService';
import { ContactZero } from '../../types';

const MotionDiv = motion.div as any;

/**
 * ContactZeroDashboard
 * 
 * The user's own profile and frame metrics.
 * This is "Contact Zero" — the canonical self-record in the Contact spine.
 */
export const ContactZeroDashboard: React.FC = () => {
  const contactZero = getContactZero() as ContactZero;
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(contactZero.identity.name);
  const [editGoal, setEditGoal] = useState(contactZero.goals.topGoal);
  const [refresh, setRefresh] = useState(0);

  // Re-fetch after edits
  const user = getContactZero() as ContactZero;

  const handleSave = () => {
    updateContact(user.id, {
      identity: { ...user.identity, name: editName },
      goals: { ...user.goals, topGoal: editGoal }
    });
    setIsEditing(false);
    setRefresh(r => r + 1);
  };

  const trendIcon = () => {
    if (user.pipeline.trend === 'up') return <TrendingUp size={16} className="text-green-500" />;
    if (user.pipeline.trend === 'down') return <TrendingDown size={16} className="text-red-500" />;
    return <Minus size={16} className="text-gray-500" />;
  };

  const scoreColor = user.pipeline.score >= 80 
    ? 'text-green-400' 
    : user.pipeline.score >= 60 
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
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1D] border border-[#333] hover:border-[#4433FF] text-white text-xs font-bold rounded transition-colors"
          >
            <Edit2 size={14} /> EDIT PROFILE
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] text-white text-xs font-bold rounded transition-colors"
            >
              <Save size={14} /> SAVE
            </button>
            <button 
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1D] border border-[#333] hover:border-red-500 text-white text-xs font-bold rounded transition-colors"
            >
              <X size={14} /> CANCEL
            </button>
          </div>
        )}
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: Identity Card */}
        <div className="bg-[#0E0E0E] border border-[#4433FF]/30 rounded-xl p-6 shadow-[0_0_30px_rgba(68,51,255,0.1)]">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-4">
              <img 
                src={user.identity.avatarUrl} 
                alt={user.identity.name}
                className="w-28 h-28 rounded-full border-4 border-[#4433FF] shadow-[0_0_20px_rgba(68,51,255,0.3)]" 
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-[#0E0E0E] flex items-center justify-center">
                <Zap size={12} className="text-white" />
              </div>
            </div>
            
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-[#1A1A1D] border border-[#4433FF] rounded px-3 py-2 text-white text-center font-display font-bold text-xl w-full"
              />
            ) : (
              <h2 className="text-2xl font-display font-bold text-white">{user.identity.name}</h2>
            )}
            
            <p className="text-xs text-gray-500 mt-1 font-mono uppercase tracking-wider">
              {user.classification.roleDescription}
            </p>
          </div>

          <div className="space-y-3 border-t border-[#2A2A2A] pt-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Email</span>
              <span className="text-white font-mono text-xs">{user.contactInfo.email || '—'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Domain</span>
              <span className="text-[#4433FF] font-bold uppercase text-xs">{user.classification.domain}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Status</span>
              <span className="text-green-400 font-bold uppercase text-xs">{user.pipeline.status}</span>
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
                {user.pipeline.score}
              </span>
              <div className="flex items-center gap-1 mb-2">
                {trendIcon()}
                <span className="text-xs text-gray-400 uppercase">{user.pipeline.trend}</span>
              </div>
            </div>
            <div className="mt-4 h-2 bg-[#1A1A1D] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#4433FF] to-[#737AFF] transition-all duration-500"
                style={{ width: `${user.pipeline.score}%` }}
              />
            </div>
          </MotionDiv>

          {/* Stage */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-green-500" />
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Current Stage</h3>
            </div>
            <div className="text-2xl font-display font-bold text-white">{user.pipeline.stage}</div>
            <div className="text-xs text-gray-500 mt-2">
              Last scan: <span className="text-white font-mono">
                {user.pipeline.lastScanAt ? new Date(user.pipeline.lastScanAt).toLocaleDateString() : 'Never'}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: Goals & Insights */}
        <div className="space-y-6">
          {/* Primary Objective */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-orange-500" />
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Primary Objective</h3>
            </div>
            {isEditing ? (
              <textarea
                value={editGoal}
                onChange={(e) => setEditGoal(e.target.value)}
                className="w-full bg-[#1A1A1D] border border-[#333] rounded p-3 text-white text-sm resize-none focus:border-[#4433FF] outline-none"
                rows={3}
                placeholder="What's your top goal?"
              />
            ) : (
              <p className="text-white font-bold">{user.goals.topGoal || 'No objective set'}</p>
            )}
          </div>

          {/* AI Insights */}
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-[#4433FF]" />
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">AI Insights</h3>
            </div>
            {user.aiModels.insights.length > 0 ? (
              <ul className="space-y-2">
                {user.aiModels.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-[#4433FF] mt-1">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 text-sm italic">Run a scan to generate insights.</p>
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
          <div className="text-3xl font-display font-bold text-white">{user.notes.length}</div>
          <div className="text-xs text-gray-600">journal entries</div>
        </div>

        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-gray-600" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tasks</span>
          </div>
          <div className="text-3xl font-display font-bold text-white">
            {user.tasks.filter(t => !t.isCompleted).length}
          </div>
          <div className="text-xs text-gray-600">pending actions</div>
        </div>

        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-gray-600" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Scans</span>
          </div>
          <div className="text-3xl font-display font-bold text-white">
            {user.history.filter(h => h.type === 'scan').length}
          </div>
          <div className="text-xs text-gray-600">completed analyses</div>
        </div>
      </div>
    </div>
  );
};

