// =============================================================================
// CASES VIEW — Active workload (contacts with active status)
// =============================================================================

import React from 'react';
import { getAllContacts } from '../../services/contactStore';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const CasesView: React.FC = () => {
    // "Cases" are contacts in an active status
    const activeContacts = getAllContacts().filter(c => c.status === 'active' && c.id !== 'contact_zero');

    const TrendIcon: React.FC<{ trend: 'up' | 'down' | 'flat' }> = ({ trend }) => {
        if (trend === 'up') return <TrendingUp size={14} className="text-green-500" />;
        if (trend === 'down') return <TrendingDown size={14} className="text-red-500" />;
        return <Minus size={14} className="text-gray-500" />;
    };

    const scoreColor = (score: number): string => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        return 'text-orange-400';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-display font-bold text-white">ACTIVE WORKLOAD</h2>
                    <p className="text-xs text-gray-500 mt-1">
                        {activeContacts.length} active contacts requiring attention
                    </p>
                </div>
            </div>

            <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#121212] text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#2A2A2A]">
                                <th className="p-4">Contact</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Domain</th>
                                <th className="p-4">Frame Score</th>
                                <th className="p-4">Last Contact</th>
                                <th className="p-4">Next Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeContacts.map(c => (
                                <tr key={c.id} className="border-b border-[#2A2A2A] hover:bg-[#1A1A1D] transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <img 
                                                src={c.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.id}`}
                                                alt={c.fullName}
                                                className="w-8 h-8 rounded-full border border-[#333]"
                                            />
                                            <span className="font-bold text-white">{c.fullName}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-400 capitalize">{c.relationshipRole}</td>
                                    <td className="p-4 text-xs text-[#4433FF] font-bold uppercase">{c.relationshipDomain}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-mono font-bold ${scoreColor(c.frame.currentScore)}`}>
                                                {c.frame.currentScore}
                                            </span>
                                            <TrendIcon trend={c.frame.trend} />
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-400">
                                        {c.lastContactAt 
                                            ? new Date(c.lastContactAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                            : '—'
                                        }
                                    </td>
                                    <td className="p-4 text-sm text-white">
                                        {c.nextActionAt 
                                            ? new Date(c.nextActionAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                            : '—'
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
