// =============================================================================
// CONTACTS VIEW — Directory of all contacts in the spine
// =============================================================================
// Accepts selectedContactId and setSelectedContactId as props from Dashboard.
// Highlights the currently selected contact row.
// Clicking a row calls setSelectedContactId to update the centralized state.
// Supports creating new contacts and archiving existing ones.
// =============================================================================

import React, { useMemo, useState } from 'react';
import { Contact, RelationshipDomain } from '../../types';
import { getAllContacts, CONTACT_ZERO, createContact, archiveContact } from '../../services/contactStore';
import { getNoteCountByContactId } from '../../services/noteStore';
import { 
  TrendingUp, TrendingDown, Minus, 
  Calendar, Target, Filter, FileText, ExternalLink,
  Plus, Archive, X
} from 'lucide-react';

// --- PROPS ---

interface ContactsViewProps {
  selectedContactId: string;
  setSelectedContactId: (id: string) => void;
  onViewDossier?: () => void;  // Optional callback to navigate to dossier view
}

type DomainFilter = 'all' | RelationshipDomain;

// --- COMPONENT ---

export const ContactsView: React.FC<ContactsViewProps> = ({ 
  selectedContactId, 
  setSelectedContactId,
  onViewDossier 
}) => {
  const [domainFilter, setDomainFilter] = useState<DomainFilter>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Add contact form state
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactFullName, setNewContactFullName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactDomain, setNewContactDomain] = useState<RelationshipDomain>('business');
  const [newContactRole, setNewContactRole] = useState('');
  const [newContactCompany, setNewContactCompany] = useState('');
  const [newContactTitle, setNewContactTitle] = useState('');
  const [newContactLocation, setNewContactLocation] = useState('');
  const [newContactLinkedIn, setNewContactLinkedIn] = useState('');
  const [newContactXHandle, setNewContactXHandle] = useState('');

  // Get all contacts (respecting archived filter)
  const allContacts = useMemo(() => getAllContacts(showArchived), [showArchived, refreshKey]);

  // Filter contacts by domain
  const filteredContacts = useMemo(() => {
    if (domainFilter === 'all') return allContacts;
    return allContacts.filter(c => c.relationshipDomain === domainFilter);
  }, [allContacts, domainFilter]);

  // Sort: Contact Zero first, then by frame score descending
  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      if (a.id === CONTACT_ZERO.id) return -1;
      if (b.id === CONTACT_ZERO.id) return 1;
      return b.frame.currentScore - a.frame.currentScore;
    });
  }, [filteredContacts]);

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const TrendIcon: React.FC<{ trend: 'up' | 'down' | 'flat' }> = ({ trend }) => {
    if (trend === 'up') return <TrendingUp size={14} className="text-green-500" />;
    if (trend === 'down') return <TrendingDown size={14} className="text-red-500" />;
    return <Minus size={14} className="text-gray-500" />;
  };

  const scoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const statusBadge = (status: Contact['status']): string => {
    const styles: Record<Contact['status'], string> = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      dormant: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
      testing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      archived: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return styles[status];
  };

  const domainBadge = (domain: RelationshipDomain): string => {
    const styles: Record<RelationshipDomain, string> = {
      business: 'bg-blue-500/20 text-blue-400',
      personal: 'bg-purple-500/20 text-purple-400',
      hybrid: 'bg-orange-500/20 text-orange-400',
    };
    return styles[domain];
  };

  // Handle row click — update centralized selectedContactId
  const handleRowClick = (contactId: string) => {
    setSelectedContactId(contactId);
  };

  // Handle double-click — navigate to dossier
  const handleRowDoubleClick = (contactId: string) => {
    setSelectedContactId(contactId);
    if (onViewDossier) {
      onViewDossier();
    }
  };

  // Handle archive contact
  const handleArchiveContact = (contactId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Protect Contact Zero
    if (contactId === CONTACT_ZERO.id) {
      return;
    }
    
    // Confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to archive this contact? They will be hidden from the main list, but you can show archived contacts using the "Show archived" toggle.'
    );
    
    if (!confirmed) {
      return;
    }
    
    archiveContact(contactId);
    
    // If archived contact was selected, switch to Contact Zero
    if (contactId === selectedContactId) {
      setSelectedContactId(CONTACT_ZERO.id);
    }
    
    setRefreshKey(k => k + 1);
  };

  // Handle create contact
  const handleCreateContact = () => {
    if (!newContactFullName.trim()) return;

    const newContact = createContact({
      fullName: newContactFullName.trim(),
      email: newContactEmail.trim() || undefined,
      relationshipDomain: newContactDomain,
      relationshipRole: newContactRole.trim() || undefined,
      company: newContactCompany.trim() || undefined,
      title: newContactTitle.trim() || undefined,
      location: newContactLocation.trim() || undefined,
      linkedinUrl: newContactLinkedIn.trim() || undefined,
      xHandle: newContactXHandle.trim() || undefined,
    });

    // Clear form
    setNewContactFullName('');
    setNewContactEmail('');
    setNewContactDomain('business');
    setNewContactRole('');
    setNewContactCompany('');
    setNewContactTitle('');
    setNewContactLocation('');
    setNewContactLinkedIn('');
    setNewContactXHandle('');
    setIsAddingContact(false);

    // Select the new contact and optionally navigate to dossier
    setSelectedContactId(newContact.id);
    setRefreshKey(k => k + 1);
    
    // Optionally navigate to dossier
    if (onViewDossier) {
      setTimeout(() => onViewDossier(), 100);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">CONTACTS DIRECTORY</h1>
          <p className="text-xs text-gray-500 mt-1">
            {sortedContacts.length} contacts • {filteredContacts.filter(c => c.status === 'active').length} active
            {selectedContactId && (
              <span className="ml-2 text-[#4433FF]">• 1 selected</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Show Archived Toggle */}
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="w-4 h-4 rounded border-[#333] bg-[#1A1A1D] text-[#4433FF] focus:ring-[#4433FF]"
            />
            <span>Show archived</span>
          </label>

          {/* Domain Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-500" />
            <div className="flex bg-[#1A1A1D] rounded-lg p-1 border border-[#333]">
              {(['all', 'business', 'personal', 'hybrid'] as DomainFilter[]).map((domain) => (
                <button
                  key={domain}
                  onClick={() => setDomainFilter(domain)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors ${
                    domainFilter === domain
                      ? 'bg-[#4433FF] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {domain}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Contact Form */}
      {isAddingContact ? (
        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Add New Contact</h3>
            <button
              onClick={() => {
                setIsAddingContact(false);
                setNewContactFullName('');
                setNewContactEmail('');
                setNewContactDomain('business');
                setNewContactRole('');
                setNewContactCompany('');
                setNewContactTitle('');
                setNewContactLocation('');
                setNewContactLinkedIn('');
                setNewContactXHandle('');
              }}
              className="text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                Full Name *
              </label>
              <input
                type="text"
                value={newContactFullName}
                onChange={(e) => setNewContactFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                Email
              </label>
              <input
                type="email"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                Domain
              </label>
              <select
                value={newContactDomain}
                onChange={(e) => setNewContactDomain(e.target.value as RelationshipDomain)}
                className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
              >
                <option value="business">Business</option>
                <option value="personal">Personal</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                Role
              </label>
              <input
                type="text"
                value={newContactRole}
                onChange={(e) => setNewContactRole(e.target.value)}
                placeholder="e.g., prospect, client, friend"
                className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                Company
              </label>
              <input
                type="text"
                value={newContactCompany}
                onChange={(e) => setNewContactCompany(e.target.value)}
                placeholder="Company name"
                className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                Title
              </label>
              <input
                type="text"
                value={newContactTitle}
                onChange={(e) => setNewContactTitle(e.target.value)}
                placeholder="Job title"
                className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                Location
              </label>
              <input
                type="text"
                value={newContactLocation}
                onChange={(e) => setNewContactLocation(e.target.value)}
                placeholder="City, State"
                className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                LinkedIn URL
              </label>
              <input
                type="url"
                value={newContactLinkedIn}
                onChange={(e) => setNewContactLinkedIn(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                X / Twitter Handle
              </label>
              <input
                type="text"
                value={newContactXHandle}
                onChange={(e) => setNewContactXHandle(e.target.value)}
                placeholder="@username"
                className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => {
                setIsAddingContact(false);
                setNewContactFullName('');
                setNewContactEmail('');
                setNewContactDomain('business');
                setNewContactRole('');
              }}
              className="px-4 py-2 bg-[#1A1A1D] border border-[#333] hover:border-red-500 text-white text-xs font-bold rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateContact}
              disabled={!newContactFullName.trim()}
              className="px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] disabled:bg-[#333] disabled:cursor-not-allowed text-white text-xs font-bold rounded transition-colors flex items-center gap-2"
            >
              <Plus size={14} /> Add Contact
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingContact(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0E0E0E] border border-[#2A2A2A] hover:border-[#4433FF] rounded-xl text-white text-sm font-bold transition-colors"
        >
          <Plus size={16} /> Add New Contact
        </button>
      )}

      {/* Contacts Table */}
      <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#121212] border-b border-[#2A2A2A]">
                <th className="text-left p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Contact</th>
                <th className="text-left p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Role</th>
                <th className="text-left p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Domain</th>
                <th className="text-left p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                <th className="text-center p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Frame</th>
                <th className="text-left p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Last Contact</th>
                <th className="text-left p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Next Action</th>
                <th className="text-center p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody>
              {sortedContacts.map((contact) => {
                const isContactZero = contact.id === CONTACT_ZERO.id;
                const isSelected = contact.id === selectedContactId;
                const noteCount = getNoteCountByContactId(contact.id);
                const isArchived = contact.status === 'archived';
                
                return (
                  <tr 
                    key={contact.id}
                    onClick={() => handleRowClick(contact.id)}
                    onDoubleClick={() => handleRowDoubleClick(contact.id)}
                    className={`border-b border-[#2A2A2A] cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-[#4433FF]/20 border-l-4 border-l-[#4433FF]' 
                        : isContactZero 
                          ? 'bg-[#4433FF]/5 hover:bg-[#4433FF]/10' 
                          : isArchived
                            ? 'opacity-60 hover:bg-[#1A1A1D]'
                            : 'hover:bg-[#1A1A1D]'
                    }`}
                  >
                    {/* Contact Name + Avatar */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img 
                            src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                            alt={contact.fullName}
                            className={`w-10 h-10 rounded-full border-2 ${
                              isSelected 
                                ? 'border-[#4433FF]' 
                                : isContactZero 
                                  ? 'border-[#4433FF]/50' 
                                  : 'border-[#333]'
                            }`}
                          />
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#4433FF] rounded-full border-2 border-[#0E0E0E]" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${isSelected ? 'text-white' : 'text-white'}`}>
                              {contact.fullName}
                            </span>
                            {isContactZero && (
                              <span className="text-[9px] bg-[#4433FF] text-white px-1.5 py-0.5 rounded font-bold uppercase">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <FileText size={10} />
                            <span>{noteCount} notes</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="p-4">
                      <span className="text-sm text-gray-300 capitalize">{contact.relationshipRole}</span>
                    </td>

                    {/* Domain */}
                    <td className="p-4">
                      <span className={`text-[10px] px-2 py-1 rounded uppercase font-bold ${domainBadge(contact.relationshipDomain)}`}>
                        {contact.relationshipDomain}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span className={`text-[10px] px-2 py-1 rounded border uppercase font-bold ${statusBadge(contact.status)}`}>
                        {contact.status}
                      </span>
                    </td>

                    {/* Frame Score + Trend */}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`text-lg font-display font-bold ${scoreColor(contact.frame.currentScore)}`}>
                          {contact.frame.currentScore}
                        </span>
                        <TrendIcon trend={contact.frame.trend} />
                      </div>
                    </td>

                    {/* Last Contact */}
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Calendar size={12} />
                        <span>{formatDate(contact.lastContactAt)}</span>
                      </div>
                    </td>

                    {/* Next Action */}
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Target size={12} className="text-[#4433FF]" />
                        <span className={contact.nextActionAt ? 'text-white' : 'text-gray-600'}>
                          {formatDate(contact.nextActionAt)}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {isSelected && onViewDossier && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDossier();
                            }}
                            className="p-2 text-[#4433FF] hover:text-white hover:bg-[#4433FF] rounded transition-colors"
                            title="View Dossier"
                          >
                            <ExternalLink size={14} />
                          </button>
                        )}
                        {!isContactZero && (
                          <button
                            onClick={(e) => handleArchiveContact(contact.id, e)}
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
                            title="Archive Contact"
                          >
                            <Archive size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selection Info */}
      {selectedContactId && (
        <div className="text-xs text-gray-500 text-center">
          Click a row to select • Double-click to view dossier
        </div>
      )}
    </div>
  );
};
