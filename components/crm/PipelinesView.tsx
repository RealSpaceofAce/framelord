
import React from 'react';
import { getContacts, getPipelineStages } from '../../services/crmService';
import { User, Activity } from 'lucide-react';

export const PipelinesView: React.FC = () => {
    const contacts = getContacts().filter(c => c.classification.domain === 'business'); // Only show business contacts in pipeline for now
    const stages = getPipelineStages();

    return (
        <div className="h-full flex flex-col pb-20">
            <h2 className="text-2xl font-display font-bold text-white mb-6">RELATIONSHIP PIPELINE</h2>
            
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <div className="flex gap-4 h-full min-w-max pb-4">
                    {stages.map(stage => {
                        const stageContacts = contacts.filter(c => c.pipeline.stage === stage.name);
                        return (
                            <div key={stage.id} className="w-80 flex flex-col h-full bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl overflow-hidden">
                                <div className="p-3 border-b border-[#2A2A2A] bg-[#121212] flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: stage.color }} />
                                        <span className="text-xs font-bold text-white uppercase">{stage.name}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-bold bg-[#1A1A1D] px-1.5 py-0.5 rounded">{stageContacts.length}</span>
                                </div>

                                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#0A0A0A]">
                                    {stageContacts.map(c => (
                                        <div key={c.id} className="bg-[#1A1A1D] border border-[#333] p-4 rounded-lg hover:border-[#4433FF] transition-all cursor-pointer group">
                                            <div className="flex items-center gap-3 mb-3">
                                                <img src={c.identity.avatarUrl} className="w-8 h-8 rounded-full border border-[#333]" />
                                                <div>
                                                    <div className="text-sm font-bold text-white">{c.identity.name}</div>
                                                    <div className="text-[10px] text-gray-500">{c.classification.type}</div>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-gray-400 bg-[#121212] p-2 rounded">
                                                <span className="flex items-center gap-1"><Activity size={10} /> Score: {c.pipeline.score}</span>
                                                <span className="text-[#4433FF]">{c.pipeline.trend}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
