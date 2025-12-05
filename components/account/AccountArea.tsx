// =============================================================================
// ACCOUNT AREA — /account
// =============================================================================
// User account management with tabs for Profile, Billing, Notifications,
// Legal, and Data & Account (export/deletion requests).
// =============================================================================

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, CreditCard, Bell, Scale, Database, Save, ExternalLink,
  Download, Trash2, AlertTriangle, Check, Shield
} from 'lucide-react';
import type { UserScope, EmailPreferences, DataRequestType } from '../../types/multiTenant';
import { getTenantUserById, updateTenantUser } from '../../stores/tenantUserStore';
import { 
  getEmailPreferences, 
  updateEmailPreferences,
  getDefaultEmailPreferences 
} from '../../stores/userNotificationStore';
import { 
  requestDataExport, 
  requestAccountDeletion,
  hasPendingDataRequest,
  getDataRequestsForUser 
} from '../../stores/dataRequestStore';
import { recordAdminAction } from '../../stores/adminAuditStore';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

type AccountTab = 'profile' | 'billing' | 'notifications' | 'legal' | 'data';

interface AccountAreaProps {
  userScope: UserScope;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AccountArea: React.FC<AccountAreaProps> = ({ userScope }) => {
  const [activeTab, setActiveTab] = useState<AccountTab>('profile');
  const [refreshKey, setRefreshKey] = useState(0);

  const user = getTenantUserById(userScope.userId);

  const tabs: { id: AccountTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User size={16} /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'legal', label: 'Legal', icon: <Scale size={16} /> },
    { id: 'data', label: 'Data & Account', icon: <Database size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] bg-[#0E0E0E]">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-white">Account Settings</h1>
          <p className="text-xs text-gray-500">Manage your account and preferences</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#2A2A2A]">
        <div className="max-w-4xl mx-auto px-6">
          <nav className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-white border-[#4433FF]'
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <MotionDiv
          key={`${activeTab}-${refreshKey}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {activeTab === 'profile' && <ProfileTab userScope={userScope} user={user} />}
          {activeTab === 'billing' && <BillingTab userScope={userScope} />}
          {activeTab === 'notifications' && <NotificationsTab userScope={userScope} />}
          {activeTab === 'legal' && <LegalTab />}
          {activeTab === 'data' && <DataTab userScope={userScope} />}
        </MotionDiv>
      </div>
    </div>
  );
};

// =============================================================================
// PROFILE TAB
// =============================================================================

const ProfileTab: React.FC<{ userScope: UserScope; user: any }> = ({ userScope, user }) => {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    
    updateTenantUser(userScope.userId, {
      displayName: displayName.trim(),
      email: email.trim(),
    });
    
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card title="Profile Information" description="Update your personal details">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-[#1A1A1D] border border-[#333] rounded-lg text-sm text-white focus:border-[#4433FF] outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#1A1A1D] border border-[#333] rounded-lg text-sm text-white focus:border-[#4433FF] outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-[#4433FF] text-white rounded-lg text-sm font-medium hover:bg-[#5544FF] disabled:opacity-50 transition-colors"
            >
              <Save size={14} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <Check size={14} />
                Saved!
              </span>
            )}
          </div>
        </div>
      </Card>

      <Card title="Account Details" description="Your account information">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">User ID</span>
            <span className="text-white font-mono text-xs">{userScope.userId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Tenant ID</span>
            <span className="text-white font-mono text-xs">{userScope.tenantId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Role</span>
            <span className="text-white">{userScope.tenantRole}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

// =============================================================================
// BILLING TAB
// =============================================================================

const BillingTab: React.FC<{ userScope: UserScope }> = ({ userScope }) => {
  return (
    <div className="space-y-6">
      <Card title="Current Plan" description="Your subscription details">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-white">Free Plan</div>
            <div className="text-sm text-gray-500">Basic access to FrameLord</div>
          </div>
          <button className="px-4 py-2 bg-[#4433FF] text-white rounded-lg text-sm font-medium hover:bg-[#5544FF] transition-colors">
            Upgrade Plan
          </button>
        </div>
      </Card>

      <Card title="Usage" description="Your usage this billing period">
        <div className="space-y-4">
          <UsageBar label="Frame Scans" used={0} limit="Unlimited" />
          <UsageBar label="Notes" used={0} limit="Unlimited" />
          <UsageBar label="Contacts" used={0} limit="Unlimited" />
        </div>
      </Card>

      <Card title="Payment Method" description="Manage your payment method">
        <div className="text-center py-8 text-gray-500">
          <CreditCard size={32} className="mx-auto mb-2" />
          <p>No payment method on file</p>
          <button className="mt-4 px-4 py-2 border border-[#333] text-white rounded-lg text-sm hover:border-[#4433FF] transition-colors">
            Add Payment Method
          </button>
        </div>
      </Card>
    </div>
  );
};

// =============================================================================
// NOTIFICATIONS TAB
// =============================================================================

const NotificationsTab: React.FC<{ userScope: UserScope }> = ({ userScope }) => {
  const [prefs, setPrefs] = useState<EmailPreferences>(getDefaultEmailPreferences());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrefs(getEmailPreferences(userScope.userId));
  }, [userScope.userId]);

  const handleToggle = (key: keyof EmailPreferences) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    updateEmailPreferences(userScope.userId, updated);
    
    recordAdminAction({
      actorUserId: userScope.userId,
      actorStaffRole: userScope.staffRole,
      scopeTenantId: userScope.tenantId,
      actionType: 'EMAIL_PREF_CHANGE',
      metadata: { [key]: updated[key] },
    });
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleItems: { key: keyof EmailPreferences; label: string; description: string }[] = [
    { key: 'productUpdates', label: 'Product Updates', description: 'New features and improvements' },
    { key: 'onboardingTips', label: 'Onboarding Tips', description: 'Helpful tips to get started' },
    { key: 'taskReminders', label: 'Task Reminders', description: 'Reminders for upcoming tasks' },
    { key: 'coachingOffers', label: 'Coaching Offers', description: 'Personalized coaching opportunities' },
    { key: 'betaReminders', label: 'Beta Reminders', description: 'Beta program status updates' },
    { key: 'marketingOffers', label: 'Marketing Offers', description: 'Special offers and promotions' },
    { key: 'surveyRequests', label: 'Survey Requests', description: 'Feedback and survey invitations' },
  ];

  return (
    <div className="space-y-6">
      <Card 
        title="Email Preferences" 
        description="Choose what emails you want to receive"
        headerRight={saved ? (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <Check size={14} />
            Saved
          </span>
        ) : undefined}
      >
        <div className="space-y-4">
          {toggleItems.map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">{item.label}</div>
                <div className="text-xs text-gray-500">{item.description}</div>
              </div>
              <Toggle enabled={prefs[item.key]} onChange={() => handleToggle(item.key)} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// =============================================================================
// LEGAL TAB
// =============================================================================

const LegalTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card title="Legal Documents" description="Review our policies and terms">
        <div className="space-y-3">
          <a
            href="/legal/privacy"
            className="flex items-center justify-between p-3 bg-[#1A1A1D] rounded-lg hover:bg-[#222] transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield size={16} className="text-[#4433FF]" />
              <span className="text-sm text-white">Privacy Policy</span>
            </div>
            <ExternalLink size={14} className="text-gray-500" />
          </a>
          <a
            href="/legal/terms"
            className="flex items-center justify-between p-3 bg-[#1A1A1D] rounded-lg hover:bg-[#222] transition-colors"
          >
            <div className="flex items-center gap-3">
              <Scale size={16} className="text-[#4433FF]" />
              <span className="text-sm text-white">Terms of Service</span>
            </div>
            <ExternalLink size={14} className="text-gray-500" />
          </a>
        </div>
      </Card>
    </div>
  );
};

// =============================================================================
// DATA TAB
// =============================================================================

const DataTab: React.FC<{ userScope: UserScope }> = ({ userScope }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasExportPending = hasPendingDataRequest(userScope.tenantId, userScope.userId, 'EXPORT');
  const hasDeletePending = hasPendingDataRequest(userScope.tenantId, userScope.userId, 'DELETE');

  const handleExportRequest = () => {
    setIsExporting(true);
    requestDataExport(userScope.tenantId, userScope.userId);
    setIsExporting(false);
    alert('Data export request submitted. You will receive an email when your data is ready.');
  };

  const handleDeleteRequest = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setIsDeleting(true);
    requestAccountDeletion(userScope.tenantId, userScope.userId);
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    alert('Account deletion request submitted. You will receive a confirmation email.');
  };

  return (
    <div className="space-y-6">
      <Card title="Export Your Data" description="Download a copy of all your data">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">
              Request a complete export of your data including contacts, notes, tasks, and settings.
            </p>
            {hasExportPending && (
              <p className="text-xs text-yellow-400 mt-2">
                You have a pending export request.
              </p>
            )}
          </div>
          <button
            onClick={handleExportRequest}
            disabled={isExporting || hasExportPending}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1D] border border-[#333] text-white rounded-lg text-sm hover:border-[#4433FF] disabled:opacity-50 transition-colors"
          >
            <Download size={14} />
            {isExporting ? 'Requesting...' : 'Request Export'}
          </button>
        </div>
      </Card>

      <Card 
        title="Delete Account" 
        description="Permanently delete your account and all data"
        variant="danger"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">
              This action is irreversible. All your data will be permanently deleted.
            </p>
            {hasDeletePending && (
              <p className="text-xs text-yellow-400 mt-2">
                You have a pending deletion request.
              </p>
            )}
          </div>
          <button
            onClick={handleDeleteRequest}
            disabled={isDeleting || hasDeletePending}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/30 disabled:opacity-50 transition-colors"
          >
            <Trash2 size={14} />
            Delete Account
          </button>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0E0E0E] rounded-xl border border-[#2A2A2A] w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete Account?</h3>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              This will permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Yes, Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const Card: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  variant?: 'default' | 'danger';
}> = ({ title, description, children, headerRight, variant = 'default' }) => (
  <div className={`bg-[#0E0E0E] rounded-xl border p-6 ${
    variant === 'danger' ? 'border-red-500/30' : 'border-[#2A2A2A]'
  }`}>
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      {headerRight}
    </div>
    {children}
  </div>
);

const Toggle: React.FC<{ enabled: boolean; onChange: () => void }> = ({ enabled, onChange }) => (
  <button
    onClick={onChange}
    className={`relative w-11 h-6 rounded-full transition-colors ${
      enabled ? 'bg-[#4433FF]' : 'bg-gray-600'
    }`}
  >
    <span
      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
        enabled ? 'translate-x-5' : ''
      }`}
    />
  </button>
);

const UsageBar: React.FC<{ label: string; used: number; limit: string | number }> = ({
  label,
  used,
  limit,
}) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="text-white">{label}</span>
      <span className="text-gray-500">
        {used} / {limit}
      </span>
    </div>
    <div className="h-2 bg-[#1A1A1D] rounded-full overflow-hidden">
      <div
        className="h-full bg-[#4433FF] rounded-full"
        style={{ width: typeof limit === 'number' ? `${(used / limit) * 100}%` : '0%' }}
      />
    </div>
  </div>
);

export default AccountArea;




