
import React from 'react';
import { getContacts } from '../../services/crmService';
import { Shield, AlertCircle } from 'lucide-react';

export const CasesView: React.FC = () => {
    // In the new architecture, "Cases" are just Contacts in an active pipeline state
    const activeContacts = getContacts().filter(c => c.pipeline.status === 'active');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-display font-bold text-white">ACTIVE WORKLOAD</h2>
            </div>

            <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#121212] text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#2A2A2A]">
                                <th className="p-4">Contact</th>
                                <th className="p-4">Stage</th>
                                <th className="p-4">Frame Score</th>
                                <th className="p-4">Top Goal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeContacts.map(c => (
                                <tr key={c.id} className="border-b border-[#2A2A2A] hover:bg-[#1A1A1D] transition-colors">
                                    <td className="p-4 font-bold text-white">{c.identity.name}</td>
                                    <td className="p-4 text-xs text-[#4433FF] font-bold uppercase">{c.pipeline.stage}</td>
                                    <td className="p-4 font-mono text-white">{c.pipeline.score}</td>
                                    <td className="p-4 text-xs text-gray-400">{c.goals.topGoal}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
