// =============================================================================
// PIPELINES VIEW — Kanban-style view of contacts by stage
// =============================================================================

import React from 'react';
import { getAllContacts } from '../../services/contactStore';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Pipeline stages (hardcoded for now)
const PIPELINE_STAGES = [
    { id: 'discovery', name: 'Discovery', color: '#60A5FA' },
    { id: 'negotiation', name: 'Negotiation', color: '#34D399' },
    { id: 'closing', name: 'Closing', color: '#FBBF24' },
    { id: 'active', name: 'Active Client', color: '#A78BFA' },
];

// Map relationship roles to pipeline stages
const roleToStage: Record<string, string> = {
    'prospect': 'discovery',
    'partner': 'negotiation',
    'client': 'active',
    'investor': 'negotiation',
    'contractor': 'active',
};

export const PipelinesView: React.FC = () => {
    // Only show business/hybrid contacts in pipeline
    const pipelineContacts = getAllContacts().filter(
        c => c.relationshipDomain !== 'personal' && c.id !== 'contact_zero'
    );

    const TrendIcon: React.FC<{ trend: 'up' | 'down' | 'flat' }> = ({ trend }) => {
        if (trend === 'up') return <TrendingUp size={12} className="text-green-500" />;
        if (trend === 'down') return <TrendingDown size={12} className="text-red-500" />;
        return <Minus size={12} className="text-gray-500" />;
    };

    return (
        <div className="h-full flex flex-col pb-20">
            <div className="mb-6">
                <h2 className="text-2xl font-display font-bold text-white">RELATIONSHIP PIPELINE</h2>
                <p className="text-xs text-gray-500 mt-1">
                    {pipelineContacts.length} contacts in pipeline
                </p>
            </div>
            
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <div className="flex gap-4 h-full min-w-max pb-4">
                    {PIPELINE_STAGES.map(stage => {
                        // Get contacts for this stage based on role mapping
                        const stageContacts = pipelineContacts.filter(
                            c => roleToStage[c.relationshipRole] === stage.id
                        );

                        return (
                            <div 
                                key={stage.id} 
                                className="w-80 flex flex-col h-full bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl overflow-hidden"
                            >
                                {/* Stage Header */}
                                <div className="p-3 border-b border-[#2A2A2A] bg-[#121212] flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div 
                                            className="w-3 h-3 rounded-sm" 
                                            style={{ backgroundColor: stage.color }} 
                                        />
                                        <span className="text-xs font-bold text-white uppercase">
                                            {stage.name}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-bold bg-[#1A1A1D] px-1.5 py-0.5 rounded">
                                        {stageContacts.length}
                                    </span>
                                </div>

                                {/* Stage Cards */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#0A0A0A]">
                                    {stageContacts.length === 0 ? (
                                        <div className="text-center py-8 text-gray-600 text-xs">
                                            No contacts in this stage
                                        </div>
                                    ) : (
                                        stageContacts.map(c => (
                                            <div 
                                                key={c.id} 
                                                className="bg-[#1A1A1D] border border-[#333] p-4 rounded-lg hover:border-[#4433FF] transition-all cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-3 mb-3">
                                                    <img 
                                                        src={c.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.id}`}
                                                        alt={c.fullName}
                                                        className="w-8 h-8 rounded-full border border-[#333]" 
                                                    />
                                                    <div>
                                                        <div className="text-sm font-bold text-white">
                                                            {c.fullName}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 capitalize">
                                                            {c.relationshipRole}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] text-gray-400 bg-[#121212] p-2 rounded">
                                                    <span className="flex items-center gap-1">
                                                        <Activity size={10} /> 
                                                        Score: {c.frame.currentScore}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <TrendIcon trend={c.frame.trend} />
                                                        {c.frame.trend}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
