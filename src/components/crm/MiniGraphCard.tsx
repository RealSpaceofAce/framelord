// =============================================================================
// MINI GRAPH CARD — Compact network visualization for a contact
// =============================================================================
// Shows a miniature graph visualization of a contact's connections.
// Displays their position in the user's network graph.
// =============================================================================

import React, { useMemo } from 'react';
import { Network, Lock, ChevronRight, Users } from 'lucide-react';

// Stores
import { getContactById, getAllContacts, CONTACT_ZERO } from '@/services/contactStore';
import { getAllInteractions } from '@/services/interactionStore';

// Plan Config
import {
  type PlanTier,
  type FeatureKey,
  canUseFeature,
  getRequiredPlan,
  PLAN_NAMES,
  LOCKED_FEATURE_TEASERS,
} from '@/config/planConfig';

// Types
interface MiniGraphCardProps {
  contactId: string;
  plan?: PlanTier;
  onExpandClick?: () => void;
  onNavigateToDossier?: (contactId: string) => void;
}

interface ConnectionNode {
  id: string;
  name: string;
  interactionCount: number;
}

/**
 * Locked Feature Overlay
 */
const LockedOverlay: React.FC<{
  featureKey: FeatureKey;
  currentPlan: PlanTier;
}> = ({ featureKey, currentPlan }) => {
  const hasAccess = canUseFeature(currentPlan, featureKey);

  if (hasAccess) return null;

  const requiredPlan = getRequiredPlan(featureKey);
  const teaser = LOCKED_FEATURE_TEASERS[featureKey];

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
      <div className="text-center px-4">
        <Lock size={20} className="mx-auto mb-2 text-gray-500" />
        {teaser ? (
          <>
            <p className="text-sm font-medium text-gray-300 mb-1">{teaser.title}</p>
            <p className="text-[10px] text-gray-500 max-w-[180px] mx-auto mb-2">{teaser.description}</p>
          </>
        ) : null}
        <p className="text-[10px] text-[#4433FF] uppercase tracking-wider">
          {PLAN_NAMES[requiredPlan]} required
        </p>
      </div>
    </div>
  );
};

/**
 * Mini Graph Card Component
 */
export const MiniGraphCard: React.FC<MiniGraphCardProps> = ({
  contactId,
  plan = 'beta_plus',
  onExpandClick,
  onNavigateToDossier,
}) => {
  const contact = getContactById(contactId);

  // Get connections through shared interactions
  const connections = useMemo(() => {
    if (!contact) return [];

    const interactions = getAllInteractions();
    const contacts = getAllContacts().filter(c => c.id !== CONTACT_ZERO.id && c.id !== contactId);

    // Count interactions with other contacts
    const interactionsByContact = new Map<string, number>();

    interactions.forEach(interaction => {
      if (interaction.contactId === contactId) {
        // This interaction is with our target contact
        // No direct connections from this
      } else {
        // Check if this contact and our target have any common interaction patterns
        // For now, we'll show contacts that the user has interacted with
        const count = interactionsByContact.get(interaction.contactId) || 0;
        interactionsByContact.set(interaction.contactId, count + 1);
      }
    });

    // Get top connections
    const connectionList: ConnectionNode[] = contacts
      .map(c => ({
        id: c.id,
        name: c.fullName,
        interactionCount: interactionsByContact.get(c.id) || 0,
      }))
      .filter(c => c.interactionCount > 0)
      .sort((a, b) => b.interactionCount - a.interactionCount)
      .slice(0, 5);

    return connectionList;
  }, [contact, contactId]);

  if (!contact) {
    return (
      <div className="bg-[#050c18] border border-[#0043FF]/40 shadow-[0_0_18px_rgba(0,0,0,0.9),0_0_24px_rgba(0,67,255,0.3)] rounded-3xl p-4">
        <p className="text-sm text-gray-500">Contact not found</p>
      </div>
    );
  }

  return (
    <div className="relative bg-[#050c18] border border-[#0043FF]/40 shadow-[0_0_18px_rgba(0,0,0,0.9),0_0_24px_rgba(0,67,255,0.3)] rounded-3xl p-4">
      <LockedOverlay featureKey="mini_graph_card" currentPlan={plan} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Network size={14} className="text-cyan-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Network</span>
        </div>
        {onExpandClick && (
          <button
            onClick={onExpandClick}
            className="text-xs text-[#4433FF] hover:text-white flex items-center gap-1"
          >
            Full Graph <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Mini Graph Visualization */}
      <div className="relative h-32 mb-4 bg-[#0a111d] rounded-lg border border-[#112035] overflow-hidden">
        {/* Center node (this contact) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="absolute inset-[-2px] rounded-full bg-gradient-to-r from-[#4433FF] to-[#7a5dff] opacity-50 blur-sm" />
            <img
              src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
              alt={contact.fullName}
              className="relative w-8 h-8 rounded-full border-2 border-[#0c1424]"
            />
          </div>
        </div>

        {/* Connection nodes */}
        {connections.slice(0, 4).map((connection, index) => {
          const angle = (index * 90 + 45) * (Math.PI / 180);
          const radius = 40;
          const x = 50 + radius * Math.cos(angle);
          const y = 50 + radius * Math.sin(angle);

          return (
            <div
              key={connection.id}
              className="absolute"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Connection line */}
              <div
                className="absolute w-8 h-[1px] bg-[#1b2c45]"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `rotate(${angle + Math.PI}rad)`,
                  transformOrigin: 'left center',
                }}
              />
              <div className="w-6 h-6 rounded-full bg-[#1b2c45] border border-[#2a3f5f] flex items-center justify-center">
                <Users size={10} className="text-gray-400" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Connections List */}
      {connections.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] text-gray-500 mb-2">Related contacts:</p>
          {connections.slice(0, 3).map(connection => (
            <div
              key={connection.id}
              className={`flex items-center justify-between text-xs p-1.5 rounded-lg -mx-1.5 ${
                onNavigateToDossier ? 'cursor-pointer hover:bg-[#1b2c45]/50' : ''
              }`}
              onClick={() => onNavigateToDossier?.(connection.id)}
            >
              <span className="text-gray-300 truncate">{connection.name}</span>
              <span className="text-[10px] text-gray-500">
                {connection.interactionCount} interaction{connection.interactionCount !== 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-sm text-gray-500">No network connections yet</p>
          <p className="text-[10px] text-gray-600 mt-1">
            Connections will appear as you interact
          </p>
        </div>
      )}
    </div>
  );
};

export default MiniGraphCard;
