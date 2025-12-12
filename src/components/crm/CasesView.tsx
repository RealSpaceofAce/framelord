// =============================================================================
// CASES VIEW — Active workload (contacts needing attention)
// =============================================================================

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getActiveWorkloadContacts } from '../../services/frameStatsService';
import { getTasksByContactId } from '../../services/taskStore';

export const CasesView: React.FC = () => {
    // Get contacts needing attention from centralized selector
    const workloadContacts = useMemo(() => {
        try {
            return getActiveWorkloadContacts('default');
        } catch (e) {
            console.error('CasesView error:', e);
            return [];
        }
    }, []);

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
        <div className="space-y-4">
            <p className="text-xs text-gray-500">
                {workloadContacts.length} contact{workloadContacts.length !== 1 ? 's' : ''} requiring attention
            </p>

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
                            {workloadContacts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500 text-sm">
                                        No contacts needing immediate attention
                                    </td>
                                </tr>
                            ) : (
                                workloadContacts.map(({ contact, frameScore, trend, lastContactAt, nextActionAt }) => (
                                    <tr key={contact.id} className="border-b border-[#2A2A2A] hover:bg-[#1A1A1D] transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                                                    alt={contact.fullName}
                                                    className="w-8 h-8 rounded-full border border-[#333]"
                                                />
                                                <span className="font-bold text-white">{contact.fullName}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-400 capitalize">{contact.relationshipRole}</td>
                                        <td className="p-4 text-xs text-[#4433FF] font-bold uppercase">{contact.relationshipDomain}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-mono font-bold ${scoreColor(frameScore)}`}>
                                                    {frameScore}
                                                </span>
                                                <TrendIcon trend={trend} />
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-400">
                                            {lastContactAt
                                                ? new Date(lastContactAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                : '—'
                                            }
                                        </td>
                                        <td className="p-4 text-sm text-white">
                                            {nextActionAt
                                                ? new Date(nextActionAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                : '—'
                                            }
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
