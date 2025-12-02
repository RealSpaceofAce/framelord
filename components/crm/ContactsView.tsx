// =============================================================================
// CONTACTS VIEW — Directory of all contacts in the spine
// =============================================================================

import React, { useState, useMemo } from 'react';
import { Contact, RelationshipDomain } from '../../types';
import { MOCK_CONTACTS, CONTACT_ZERO } from '../../services/contactStore';
import { getNoteCountByContactId } from '../../services/noteStore';
import { 
  User, TrendingUp, TrendingDown, Minus, 
  Calendar, Target, Filter, FileText
} from 'lucide-react';

type DomainFilter = 'all' | RelationshipDomain;

export const ContactsView: React.FC = () => {
  const [domainFilter, setDomainFilter] = useState<DomainFilter>('all');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Filter contacts by domain
  const filteredContacts = useMemo(() => {
    if (domainFilter === 'all') return MOCK_CONTACTS;
    return MOCK_CONTACTS.filter(c => c.relationshipDomain === domainFilter);
  }, [domainFilter]);

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

  if (selectedContact) {
    return (
      <ContactDetail 
        contact={selectedContact} 
        onBack={() => setSelectedContact(null)} 
      />
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">CONTACTS DIRECTORY</h1>
          <p className="text-xs text-gray-500 mt-1">
            {sortedContacts.length} contacts • {filteredContacts.filter(c => c.status === 'active').length} active
          </p>
        </div>

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
              </tr>
            </thead>
            <tbody>
              {sortedContacts.map((contact) => {
                const isContactZero = contact.id === CONTACT_ZERO.id;
                const noteCount = getNoteCountByContactId(contact.id);
                
                return (
                  <tr 
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`border-b border-[#2A2A2A] cursor-pointer transition-colors ${
                      isContactZero 
                        ? 'bg-[#4433FF]/5 hover:bg-[#4433FF]/10' 
                        : 'hover:bg-[#1A1A1D]'
                    }`}
                  >
                    {/* Contact Name + Avatar */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                          alt={contact.fullName}
                          className={`w-10 h-10 rounded-full border-2 ${isContactZero ? 'border-[#4433FF]' : 'border-[#333]'}`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{contact.fullName}</span>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// CONTACT DETAIL VIEW
// =============================================================================

const ContactDetail: React.FC<{ contact: Contact; onBack: () => void }> = ({ contact, onBack }) => {
  const isContactZero = contact.id === CONTACT_ZERO.id;
  const noteCount = getNoteCountByContactId(contact.id);

  const scoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="text-xs text-gray-500 hover:text-white uppercase tracking-wider flex items-center gap-2"
      >
        ← Back to Directory
      </button>

      {/* Header Card */}
      <div className={`bg-[#0E0E0E] border rounded-xl p-6 ${isContactZero ? 'border-[#4433FF]/50' : 'border-[#2A2A2A]'}`}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <img 
              src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
              alt={contact.fullName}
              className={`w-20 h-20 rounded-full border-4 ${isContactZero ? 'border-[#4433FF]' : 'border-[#333]'}`}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-display font-bold text-white">{contact.fullName}</h1>
                {isContactZero && (
                  <span className="text-[10px] bg-[#4433FF] text-white px-2 py-0.5 rounded font-bold uppercase">
                    Contact Zero
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 capitalize">{contact.relationshipRole}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] px-2 py-1 rounded bg-[#1A1A1D] text-gray-400 uppercase">
                  {contact.relationshipDomain}
                </span>
                <span className="text-[10px] px-2 py-1 rounded bg-[#1A1A1D] text-gray-400 uppercase">
                  {contact.status}
                </span>
              </div>
            </div>
          </div>

          {/* Frame Score */}
          <div className="bg-[#1A1A1D] rounded-xl p-6 text-center min-w-[150px]">
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Frame Score</div>
            <div className={`text-5xl font-display font-bold ${scoreColor(contact.frame.currentScore)}`}>
              {contact.frame.currentScore}
            </div>
            <div className="text-xs text-gray-500 mt-2 uppercase">
              Trend: <span className="text-white">{contact.frame.trend}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Contact Info</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="text-white">{contact.email || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Phone</span>
              <span className="text-white">{contact.phone || '—'}</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Timeline</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Last Contact</span>
              <span className="text-white">
                {contact.lastContactAt ? new Date(contact.lastContactAt).toLocaleDateString() : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Next Action</span>
              <span className="text-white">
                {contact.nextActionAt ? new Date(contact.nextActionAt).toLocaleDateString() : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Scan</span>
              <span className="text-white">
                {contact.frame.lastScanAt ? new Date(contact.frame.lastScanAt).toLocaleDateString() : 'Never'}
              </span>
            </div>
          </div>
        </div>

        {/* Activity */}
        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Activity</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Notes</span>
              <span className="text-white font-bold">{noteCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tags</span>
              <span className="text-white">{contact.tags.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      {contact.tags.length > 0 && (
        <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {contact.tags.map((tag) => (
              <span 
                key={tag}
                className="text-xs px-3 py-1 rounded-full bg-[#4433FF]/20 text-[#737AFF] border border-[#4433FF]/30"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
