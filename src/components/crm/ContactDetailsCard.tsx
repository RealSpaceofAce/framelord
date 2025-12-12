// =============================================================================
// CONTACT DETAILS CARD — Personal contact information for a contact
// =============================================================================
// Displays real-world contact details:
// - Phone (click-to-call), Email (click-to-email)
// - Location, Time zone
// - Birthday, Kids, Marital status
// - Favorite color/drink
// - Social profiles (X, LinkedIn, etc.)
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Cake,
  Users,
  Heart,
  Palette,
  Coffee,
  Globe,
  Edit2,
  Save,
  X,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

// Stores
import { getContactById, updateContact } from '@/services/contactStore';

// Types
import type { Contact, ContactPersonalDetails, ContactSocialProfile } from '@/types';

interface ContactDetailsCardProps {
  contactId: string;
  onExpandClick?: () => void;
  onRefresh?: () => void;
}

/**
 * Detail Row Component
 */
const DetailRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string | number | null;
  href?: string;
  isExternal?: boolean;
}> = ({ icon, label, value, href, isExternal }) => {
  if (!value && value !== 0) return null;

  const content = (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[#0a111d] transition-colors group">
      <div className="text-gray-500 group-hover:text-gray-400 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-white truncate">{value}</p>
      </div>
      {href && isExternal && (
        <ExternalLink size={12} className="text-gray-600 group-hover:text-[#4433FF] transition-colors" />
      )}
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="block"
      >
        {content}
      </a>
    );
  }

  return content;
};

/**
 * Social Profile Link
 */
const SocialLink: React.FC<{ profile: ContactSocialProfile }> = ({ profile }) => {
  // Map common platforms to colors
  const platformColors: Record<string, string> = {
    x: 'hover:text-white',
    twitter: 'hover:text-sky-400',
    linkedin: 'hover:text-blue-500',
    instagram: 'hover:text-pink-500',
    facebook: 'hover:text-blue-600',
    github: 'hover:text-white',
    website: 'hover:text-[#4433FF]',
  };

  const colorClass = platformColors[profile.label.toLowerCase()] || 'hover:text-[#4433FF]';

  return (
    <a
      href={profile.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 px-3 py-1.5 bg-[#0a111d] rounded-lg border border-[#112035] text-gray-400 ${colorClass} transition-colors group`}
    >
      <Globe size={12} />
      <span className="text-xs">{profile.handle || profile.label}</span>
      <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
};

/**
 * Format birthday for display
 */
function formatBirthday(birthday?: string): string | null {
  if (!birthday) return null;
  try {
    const date = new Date(birthday + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  } catch {
    return birthday;
  }
}

/**
 * Format timezone for display
 */
function formatTimezone(tz?: string): string | null {
  if (!tz) return null;
  // Convert IANA timezone to readable format
  // e.g., "America/Los_Angeles" -> "Los Angeles (PT)"
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(now);
    const tzAbbr = parts.find(p => p.type === 'timeZoneName')?.value || '';
    const cityName = tz.split('/').pop()?.replace(/_/g, ' ') || tz;
    return `${cityName} (${tzAbbr})`;
  } catch {
    return tz;
  }
}

/**
 * Contact Details Card Component
 */
export const ContactDetailsCard: React.FC<ContactDetailsCardProps> = ({
  contactId,
  onExpandClick,
  onRefresh,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);

  // Get contact data
  const contact = useMemo(() => getContactById(contactId), [contactId, refreshKey]);
  const personal = contact?.personal;

  if (!contact) {
    return (
      <div className="bg-[#0c1424]/80 border border-[#1b2c45] rounded-xl p-4">
        <p className="text-sm text-gray-500">Contact not found</p>
      </div>
    );
  }

  // Check if we have any personal details to show
  const hasContactInfo = personal?.primaryPhone || personal?.primaryEmail || personal?.location || personal?.timeZone;
  const hasPersonalInfo = personal?.birthday || personal?.kidsCount !== undefined || personal?.maritalStatus;
  const hasPreferences = personal?.favoriteColor || personal?.favoriteDrink;
  const hasSocialProfiles = personal?.socialProfiles && personal.socialProfiles.length > 0;
  const hasAnyData = hasContactInfo || hasPersonalInfo || hasPreferences || hasSocialProfiles;

  return (
    <div className="relative bg-[#0c1424]/80 border border-[#1b2c45] rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-cyan-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Contact Details</span>
        </div>
        <div className="flex items-center gap-2">
          {onExpandClick && (
            <button
              onClick={onExpandClick}
              className="text-xs text-[#4433FF] hover:text-white flex items-center gap-1"
            >
              Edit <Edit2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {hasAnyData ? (
        <div className="space-y-1">
          {/* Contact Information */}
          {hasContactInfo && (
            <div className="space-y-0.5">
              <DetailRow
                icon={<Phone size={14} />}
                label="Phone"
                value={personal?.primaryPhone}
                href={personal?.primaryPhone ? `tel:${personal.primaryPhone.replace(/\s/g, '')}` : undefined}
              />
              <DetailRow
                icon={<Mail size={14} />}
                label="Email"
                value={personal?.primaryEmail}
                href={personal?.primaryEmail ? `mailto:${personal.primaryEmail}` : undefined}
              />
              <DetailRow
                icon={<MapPin size={14} />}
                label="Location"
                value={personal?.location}
              />
              <DetailRow
                icon={<Clock size={14} />}
                label="Time Zone"
                value={formatTimezone(personal?.timeZone)}
              />
            </div>
          )}

          {/* Divider if we have both sections */}
          {hasContactInfo && (hasPersonalInfo || hasPreferences) && (
            <div className="border-t border-[#112035] my-2" />
          )}

          {/* Personal Information */}
          {hasPersonalInfo && (
            <div className="space-y-0.5">
              <DetailRow
                icon={<Cake size={14} />}
                label="Birthday"
                value={formatBirthday(personal?.birthday)}
              />
              {personal?.kidsCount !== undefined && personal.kidsCount > 0 && (
                <DetailRow
                  icon={<Users size={14} />}
                  label="Kids"
                  value={personal.kidsCount === 1 ? '1 child' : `${personal.kidsCount} children`}
                />
              )}
              <DetailRow
                icon={<Heart size={14} />}
                label="Status"
                value={personal?.maritalStatus ? personal.maritalStatus.charAt(0).toUpperCase() + personal.maritalStatus.slice(1) : undefined}
              />
            </div>
          )}

          {/* Preferences */}
          {hasPreferences && (
            <>
              {(hasContactInfo || hasPersonalInfo) && (
                <div className="border-t border-[#112035] my-2" />
              )}
              <div className="space-y-0.5">
                <DetailRow
                  icon={<Palette size={14} />}
                  label="Favorite Color"
                  value={personal?.favoriteColor}
                />
                <DetailRow
                  icon={<Coffee size={14} />}
                  label="Favorite Drink"
                  value={personal?.favoriteDrink}
                />
              </div>
            </>
          )}

          {/* Social Profiles */}
          {hasSocialProfiles && (
            <>
              <div className="border-t border-[#112035] my-2" />
              <div className="pt-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2 px-3">Social</p>
                <div className="flex flex-wrap gap-2 px-3">
                  {personal!.socialProfiles!.map((profile, idx) => (
                    <SocialLink key={idx} profile={profile} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Empty state */
        <div className="text-center py-6">
          <Users size={24} className="mx-auto text-gray-600 mb-2" />
          <p className="text-sm text-gray-500">No contact details yet</p>
          <p className="text-[10px] text-gray-600 mt-1">
            Add phone, email, or other personal info
          </p>
          {onExpandClick && (
            <button
              onClick={onExpandClick}
              className="mt-3 text-xs text-[#4433FF] hover:text-white flex items-center gap-1 mx-auto"
            >
              Add details <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ContactDetailsCard;
