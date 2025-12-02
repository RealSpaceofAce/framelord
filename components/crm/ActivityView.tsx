// =============================================================================
// ACTIVITY VIEW — Global Activity Dashboard
// =============================================================================
// Shows all interactions across all contacts with filtering by type.
// Contact names are clickable to navigate to their dossier.
// =============================================================================

import React, { useState, useMemo } from 'react';
import { 
  PhoneCall, Users, MessageSquare, Mail, AtSign, Activity,
  ArrowRight, Filter, Clock
} from 'lucide-react';
import { getAllInteractions } from '../../services/interactionStore';
import { getContactById, CONTACT_ZERO } from '../../services/contactStore';
import { Interaction, InteractionType } from '../../types';

// --- PROPS ---

interface ActivityViewProps {
  selectedContactId: string;
  setSelectedContactId: (id: string) => void;
  onNavigateToDossier: () => void;
}

type TypeFilter = 'all' | InteractionType;

// --- COMPONENT ---

export const ActivityView: React.FC<ActivityViewProps> = ({
  selectedContactId,
  setSelectedContactId,
  onNavigateToDossier
}) => {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Get all interactions
  const allInteractions = useMemo(() => getAllInteractions(), [refreshKey]);

  // Filter interactions by type
  const filteredInteractions = useMemo(() => {
    if (typeFilter === 'all') return allInteractions;
    return allInteractions.filter(i => i.type === typeFilter);
  }, [allInteractions, typeFilter]);

  // Stats
  const stats = useMemo(() => {
    const call = allInteractions.filter(i => i.type === 'call').length;
    const meeting = allInteractions.filter(i => i.type === 'meeting').length;
    const message = allInteractions.filter(i => i.type === 'message').length;
    const email = allInteractions.filter(i => i.type === 'email').length;
    const dm = allInteractions.filter(i => i.type === 'dm').length;
    const other = allInteractions.filter(i => i.type === 'other').length;
    return { total: allInteractions.length, call, meeting, message, email, dm, other };
  }, [allInteractions]);

  // Handle contact click
  const handleContactClick = (contactId: string) => {
    setSelectedContactId(contactId);
    onNavigateToDossier();
  };

  // Format date/time
  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Get interaction type icon
  const getInteractionTypeIcon = (type: InteractionType) => {
    const iconClass = "text-gray-400";
    switch (type) {
      case 'call':
        return <PhoneCall size={16} className={iconClass} />;
      case 'meeting':
        return <Users size={16} className={iconClass} />;
      case 'message':
        return <MessageSquare size={16} className={iconClass} />;
      case 'email':
        return <Mail size={16} className={iconClass} />;
      case 'dm':
        return <AtSign size={16} className={iconClass} />;
      default:
        return <Activity size={16} className={iconClass} />;
    }
  };

  // Get interaction type label
  const getInteractionTypeLabel = (type: InteractionType): string => {
    const labels: Record<InteractionType, string> = {
      call: 'Call',
      meeting: 'Meeting',
      message: 'Message',
      email: 'Email',
      dm: 'DM',
      other: 'Other',
    };
    return labels[type];
  };

  // Type badge styles
  const typeBadge = (type: InteractionType) => {
    const styles: Record<InteractionType, string> = {
      call: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      meeting: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      message: 'bg-green-500/20 text-green-400 border-green-500/30',
      email: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      dm: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return styles[type];
  };

  return (
    <div className="flex h-full bg-[#030412]">
      {/* Sidebar */}
      <div className="w-72 bg-[#0E0E0E] border-r border-[#2A2A2A] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={18} className="text-[#4433FF]" />
            <h2 className="font-display font-bold text-white">ACTIVITY</h2>
          </div>
          <p className="text-[10px] text-gray-500">All interactions across contacts</p>
        </div>

        {/* Filter Buttons */}
        <div className="p-4 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={12} className="text-gray-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Filter by Type</span>
          </div>
          <div className="space-y-1">
            {(['all', 'call', 'meeting', 'message', 'email', 'dm', 'other'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-bold uppercase transition-colors ${
                  typeFilter === type
                    ? 'bg-[#4433FF] text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#1A1A1D]'
                }`}
              >
                <span>{type}</span>
                <span className="text-[10px] opacity-60">
                  {type === 'all' ? stats.total : stats[type as InteractionType]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 flex-1">
          <div className="space-y-2">
            <div className="bg-[#1A1A1D] rounded-lg p-3 border border-[#333]">
              <div className="flex items-center gap-2 mb-1">
                <Activity size={12} className="text-[#4433FF]" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total</span>
              </div>
              <div className="text-2xl font-display font-bold text-white">{stats.total}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2A] bg-[#0E0E0E]">
          <h1 className="text-xl font-display font-bold text-white">
            {typeFilter === 'all' ? 'All Activity' : `${getInteractionTypeLabel(typeFilter as InteractionType)} Activity`}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {filteredInteractions.length} interaction{filteredInteractions.length !== 1 ? 's' : ''} • Sorted by date
          </p>
        </div>

        {/* Interactions List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredInteractions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Activity size={48} className="text-gray-700 mb-4" />
              <h3 className="text-lg font-bold text-gray-500 mb-2">No interactions found</h3>
              <p className="text-sm text-gray-600 max-w-sm">
                {typeFilter === 'all' 
                  ? 'Log interactions from contact dossiers to get started'
                  : `No ${typeFilter} interactions at the moment`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInteractions.map((interaction) => {
                const interactionContact = getContactById(interaction.contactId);
                if (!interactionContact) return null;
                const isContactZeroInteraction = interaction.contactId === CONTACT_ZERO.id;

                return (
                  <div 
                    key={interaction.id}
                    className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-lg p-4 hover:border-[#4433FF]/30 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Type Icon */}
                      <div className="mt-1">
                        {getInteractionTypeIcon(interaction.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header Row */}
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${typeBadge(interaction.type)}`}>
                            {getInteractionTypeLabel(interaction.type)}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Clock size={12} />
                            {formatDateTime(interaction.occurredAt)}
                          </div>
                        </div>

                        {/* Summary */}
                        <p className="text-sm text-white mb-3 leading-relaxed">
                          {interaction.summary}
                        </p>

                        {/* Contact */}
                        <button
                          onClick={() => handleContactClick(interactionContact.id)}
                          className="flex items-center gap-2 hover:bg-[#1A1A1D] rounded px-2 py-1 -ml-2 transition-colors group"
                        >
                          <img
                            src={interactionContact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${interactionContact.id}`}
                            alt={interactionContact.fullName}
                            className="w-6 h-6 rounded-full border border-[#333]"
                          />
                          <span className="text-xs text-[#4433FF] group-hover:text-white font-medium flex items-center gap-1">
                            {interactionContact.fullName}
                            {isContactZeroInteraction && (
                              <span className="text-[9px] bg-[#4433FF]/20 text-[#4433FF] px-1 py-0.5 rounded">You</span>
                            )}
                            <ArrowRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

