// =============================================================================
// BROADCAST PANEL — Admin notification broadcast system
// =============================================================================
// Allows Super Admin to send notifications to user sidebars.
// Supports global, tenant-scoped, and user-scoped broadcasts.
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  Send, Radio, Building2, User, Eye, Bell, AlertCircle, CheckCircle
} from 'lucide-react';
import type { UserScope } from '../../../types/multiTenant';
import type { BroadcastScope } from '../../../types/usage';
import { getAllTenants } from '../../../stores/tenantStore';
import { getAllTenantUsers } from '../../../stores/tenantUserStore';
import { enqueueBroadcastNotification } from '../../../stores/userNotificationStore';

interface BroadcastPanelProps {
  userScope: UserScope;
}

export const BroadcastPanel: React.FC<BroadcastPanelProps> = ({
  userScope,
}) => {
  const [scope, setScope] = useState<BroadcastScope>('GLOBAL');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const tenants = useMemo(() => getAllTenants(), []);
  const allUsers = useMemo(() => getAllTenantUsers(), []);
  
  const filteredUsers = useMemo(() => {
    if (scope === 'USER' && selectedTenantId) {
      return allUsers.filter(u => u.tenantId === selectedTenantId);
    }
    return allUsers;
  }, [allUsers, scope, selectedTenantId]);

  const selectedTenant = tenants.find(t => t.tenantId === selectedTenantId);
  const selectedUser = allUsers.find(u => u.userId === selectedUserId);

  // Estimate recipient count
  const recipientCount = useMemo(() => {
    if (scope === 'GLOBAL') {
      return allUsers.filter(u => u.isActive).length;
    }
    if (scope === 'TENANT' && selectedTenantId) {
      return allUsers.filter(u => u.tenantId === selectedTenantId && u.isActive).length;
    }
    if (scope === 'USER' && selectedUserId) {
      return 1;
    }
    return 0;
  }, [scope, selectedTenantId, selectedUserId, allUsers]);

  const canSend = title.trim() && body.trim() && (
    scope === 'GLOBAL' ||
    (scope === 'TENANT' && selectedTenantId) ||
    (scope === 'USER' && selectedUserId)
  );

  const handleSend = async () => {
    if (!canSend) return;
    
    setSendStatus('sending');
    setStatusMessage('Sending broadcast...');
    
    try {
      // Call the notification store function
      const result = enqueueBroadcastNotification({
        scope,
        tenantId: scope === 'GLOBAL' ? null : selectedTenantId || null,
        userId: scope === 'USER' ? selectedUserId : null,
        title: title.trim(),
        body: body.trim(),
        createdBy: userScope.userId,
      });
      
      if (result.success) {
        setSendStatus('success');
        setStatusMessage(`Broadcast sent to ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}`);
        // Reset form
        setTitle('');
        setBody('');
        setShowPreview(false);
      } else {
        throw new Error(result.error || 'Failed to send broadcast');
      }
    } catch (error) {
      setSendStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to send broadcast');
    }
    
    // Reset status after delay
    setTimeout(() => {
      setSendStatus('idle');
      setStatusMessage('');
    }, 5000);
  };

  const scopeOptions: { value: BroadcastScope; label: string; icon: React.ReactNode; description: string }[] = [
    { 
      value: 'GLOBAL', 
      label: 'All Users', 
      icon: <Radio size={16} />,
      description: 'Send to every user on the platform'
    },
    { 
      value: 'TENANT', 
      label: 'Specific Tenant', 
      icon: <Building2 size={16} />,
      description: 'Send to all users in a tenant'
    },
    { 
      value: 'USER', 
      label: 'Specific User', 
      icon: <User size={16} />,
      description: 'Send to a single user'
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Radio size={20} className="text-[#4433FF]" />
            Broadcast Notifications
          </h3>
          <p className="text-xs text-gray-500 mt-1">Send messages to user sidebars</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Compose Form */}
        <div className="space-y-6">
          {/* Scope Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Recipient Scope
            </label>
            <div className="grid grid-cols-3 gap-3">
              {scopeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    setScope(option.value);
                    if (option.value === 'GLOBAL') {
                      setSelectedTenantId('');
                      setSelectedUserId('');
                    }
                  }}
                  className={`p-3 rounded-lg border transition-colors text-left ${
                    scope === option.value
                      ? 'border-[#4433FF] bg-[#4433FF]/10'
                      : 'border-[#2A2A2A] bg-[#1A1A1D] hover:border-[#4433FF]/50'
                  }`}
                >
                  <div className={`flex items-center gap-2 mb-1 ${
                    scope === option.value ? 'text-[#4433FF]' : 'text-gray-400'
                  }`}>
                    {option.icon}
                    <span className="text-sm font-medium">{option.label}</span>
                  </div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tenant Selector */}
          {(scope === 'TENANT' || scope === 'USER') && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Select Tenant
              </label>
              <select
                value={selectedTenantId}
                onChange={(e) => {
                  setSelectedTenantId(e.target.value);
                  setSelectedUserId('');
                }}
                className="w-full px-4 py-2 bg-[#1A1A1D] border border-[#2A2A2A] rounded-lg text-sm text-white focus:border-[#4433FF] outline-none"
              >
                <option value="">Select a tenant...</option>
                {tenants.map(tenant => (
                  <option key={tenant.tenantId} value={tenant.tenantId}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User Selector */}
          {scope === 'USER' && selectedTenantId && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Select User
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-4 py-2 bg-[#1A1A1D] border border-[#2A2A2A] rounded-lg text-sm text-white focus:border-[#4433FF] outline-none"
              >
                <option value="">Select a user...</option>
                {filteredUsers.map(user => (
                  <option key={user.userId} value={user.userId}>
                    {user.displayName} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title..."
              maxLength={100}
              className="w-full px-4 py-2 bg-[#1A1A1D] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-gray-500 focus:border-[#4433FF] outline-none"
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {title.length}/100
            </div>
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-gray-500 focus:border-[#4433FF] outline-none resize-none"
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {body.length}/500
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <Eye size={14} />
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            
            <button
              onClick={handleSend}
              disabled={!canSend || sendStatus === 'sending'}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                canSend && sendStatus !== 'sending'
                  ? 'bg-[#4433FF] text-white hover:bg-[#5544FF]'
                  : 'bg-[#2A2A2A] text-gray-500 cursor-not-allowed'
              }`}
            >
              <Send size={14} />
              {sendStatus === 'sending' ? 'Sending...' : 'Send Broadcast'}
            </button>
          </div>

          {/* Status Message */}
          {sendStatus !== 'idle' && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              sendStatus === 'success' ? 'bg-green-500/10 text-green-400' :
              sendStatus === 'error' ? 'bg-red-500/10 text-red-400' :
              'bg-[#4433FF]/10 text-[#4433FF]'
            }`}>
              {sendStatus === 'success' && <CheckCircle size={14} />}
              {sendStatus === 'error' && <AlertCircle size={14} />}
              {sendStatus === 'sending' && <Bell size={14} className="animate-pulse" />}
              <span className="text-sm">{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Preview Section */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Preview & Summary
          </label>
          
          {/* Recipient Summary */}
          <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A] mb-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Recipients
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Scope</span>
                <span className="text-white">{scope}</span>
              </div>
              {selectedTenant && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Tenant</span>
                  <span className="text-white">{selectedTenant.name}</span>
                </div>
              )}
              {selectedUser && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">User</span>
                  <span className="text-white">{selectedUser.displayName}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-[#2A2A2A]">
                <span className="text-gray-400">Total Recipients</span>
                <span className="text-white font-medium">{recipientCount}</span>
              </div>
            </div>
          </div>

          {/* Notification Preview */}
          {showPreview && (title || body) && (
            <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Notification Preview
              </h4>
              <div className="bg-[#0A0A0A] rounded-lg p-4 border border-[#2A2A2A]">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[#4433FF]/20 rounded-lg">
                    <Bell size={16} className="text-[#4433FF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-sm font-medium text-white truncate">
                        {title || 'Notification Title'}
                      </h5>
                      <span className="text-xs text-gray-500">Just now</span>
                    </div>
                    <p className="text-sm text-gray-400 whitespace-pre-wrap">
                      {body || 'Notification message will appear here...'}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                This is how the notification will appear in user sidebars.
              </p>
            </div>
          )}

          {/* Help Text */}
          <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A] mt-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Tips
            </h4>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Keep titles short and actionable</li>
              <li>• Messages should be clear and relevant</li>
              <li>• Use global broadcasts sparingly</li>
              <li>• Target specific tenants or users when possible</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BroadcastPanel;






