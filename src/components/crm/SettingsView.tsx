// =============================================================================
// SETTINGS VIEW — User Settings and Preferences
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  User,
  CreditCard,
  Moon,
  Bell,
  Shield,
  HelpCircle,
  Save,
  Mail,
  Phone,
  MapPin,
  Building,
  Briefcase,
  Link as LinkIcon,
  ExternalLink,
  Download,
  Trash2,
  AlertTriangle,
  Check,
  X,
  Key,
  Info,
  FileText,
  Keyboard,
  Command,
  Crown,
} from 'lucide-react';
import { appConfig } from '../../config/appConfig';
import {
  loadUserSettings,
  saveUserSettings,
  getLittleLordShortcut,
  setLittleLordShortcut,
  getGlobalDarkMode,
  setGlobalDarkMode,
  applyGlobalTheme,
  type LittleLordShortcutPreference,
} from '../../lib/settings/userSettings';
import { useSavageMode } from '../../hooks/useSavageMode';
import { CONTACT_ZERO, getContactZero, updateContact } from '../../services/contactStore';
import {
  getNotificationSettings,
  updateNotificationSettings,
} from '../../services/systemLogStore';
import {
  getTenantBilling,
  getCurrentPlanTier,
  hasActiveSubscription,
} from '../../services/billingStore';
import {
  PLAN_NAMES,
  PLAN_PRICES,
  PLAN_QUOTAS,
  getFrameScanQuota,
  type PlanTier,
  type ProductionTier,
} from '../../config/planConfig';
import {
  createCheckoutSessionApi,
  createPortalSessionApi,
  handleCheckoutSuccess,
  getAvailableUpgrades,
} from '../../api/stripeApi';

type SettingsTab = 'profile' | 'billing' | 'appearance' | 'notifications' | 'integrations' | 'privacy' | 'help';

// Savage Mode Toggle Component
const SavageModeToggle: React.FC = () => {
  const { isEnabled, toggle } = useSavageMode();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white mb-1">Enable Savage Feedback</div>
          <div className="text-xs text-gray-500">
            Get brutally honest (but clean) feedback from FrameScan and Little Lord.
            No sugarcoating, no profanity - just direct truth.
          </div>
        </div>
        <button
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isEnabled ? 'bg-red-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      {isEnabled && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <span className="text-xs text-red-400">
            Savage Mode is active. Your feedback will be more direct and unfiltered.
          </span>
        </div>
      )}
    </div>
  );
};

// Billing Section Component
interface BillingSectionProps {
  user: any;
}

const BillingSection: React.FC<BillingSectionProps> = ({ user }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get tenant ID (using contact zero's id as proxy in dev)
  const tenantId = user?.id || 'default-tenant';
  const billing = getTenantBilling(tenantId);
  const currentTier = getCurrentPlanTier(tenantId);
  const isActive = hasActiveSubscription(tenantId);
  const availableUpgrades = getAvailableUpgrades(currentTier);

  // Check for checkout success on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const sessionId = params.get('session_id');
    const tier = params.get('tier') as PlanTier | null;

    if (success === 'true' && sessionId && tier) {
      handleCheckoutSuccess(tenantId, sessionId, tier);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [tenantId]);

  const handleUpgrade = async (targetTier: ProductionTier) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await createCheckoutSessionApi({
        tenantId,
        userId: user?.id || 'user-1',
        email: user?.email || 'user@example.com',
        targetTier,
      });

      if (result.success && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        setError(result.error || 'Failed to create checkout session');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await createPortalSessionApi({
        tenantId,
        userId: user?.id || 'user-1',
      });

      if (result.success && result.portalUrl) {
        window.location.href = result.portalUrl;
      } else {
        setError(result.error || 'Failed to open billing portal');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Get quota info for current tier
  const quota = PLAN_QUOTAS[currentTier] || PLAN_QUOTAS.beta_free;
  const frameScanQuota = getFrameScanQuota(currentTier);

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className="glass-card rounded-lg p-6 border border-[#1f2f45]">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white mb-1">Current Plan</h3>
          <p className="text-xs text-[#7fa6d1]">Your subscription and usage details</p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-[#4433FF]/20 flex items-center justify-center">
              <Crown size={24} className="text-[#4433FF]" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">
                {PLAN_NAMES[currentTier] || currentTier}
              </div>
              <div className="text-xs text-gray-500">
                {billing.billingStatus === 'active' && 'Active subscription'}
                {billing.billingStatus === 'trialing' && 'Trial period'}
                {billing.billingStatus === 'canceled' && billing.validUntil && (
                  <>Canceled - valid until {new Date(billing.validUntil).toLocaleDateString()}</>
                )}
                {billing.billingStatus === 'past_due' && (
                  <span className="text-orange-400">Payment past due</span>
                )}
                {billing.billingStatus === 'none' && 'Free tier'}
              </div>
            </div>
          </div>

          {PLAN_PRICES[currentTier as keyof typeof PLAN_PRICES] !== undefined && (
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                ${PLAN_PRICES[currentTier as keyof typeof PLAN_PRICES]}
                <span className="text-sm font-normal text-gray-500">/mo</span>
              </div>
            </div>
          )}
        </div>

        {/* Usage Quotas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-[#0E0E0E] rounded-lg border border-[#2A2A2A]">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
              FrameScans/Day
            </div>
            <div className="text-lg font-bold text-white">
              {frameScanQuota.daily === -1 ? '∞' : frameScanQuota.daily}
            </div>
          </div>
          <div className="p-3 bg-[#0E0E0E] rounded-lg border border-[#2A2A2A]">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
              AI Queries/Day
            </div>
            <div className="text-lg font-bold text-white">
              {quota.aiQueriesDaily === -1 ? '∞' : quota.aiQueriesDaily}
            </div>
          </div>
          <div className="p-3 bg-[#0E0E0E] rounded-lg border border-[#2A2A2A]">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
              Contacts
            </div>
            <div className="text-lg font-bold text-white">
              {quota.contactsLimit === -1 ? '∞' : quota.contactsLimit}
            </div>
          </div>
          <div className="p-3 bg-[#0E0E0E] rounded-lg border border-[#2A2A2A]">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
              Call Minutes
            </div>
            <div className="text-lg font-bold text-white">
              {quota.callAnalyzerMinutes === 0 ? '—' : quota.callAnalyzerMinutes === -1 ? '∞' : quota.callAnalyzerMinutes}
            </div>
          </div>
        </div>

        {/* Manage Billing Button (for active subscribers) */}
        {billing.stripeCustomerId && (
          <button
            onClick={handleManageBilling}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1A1A1D] border border-[#333] rounded-lg hover:border-[#4433FF] transition-colors text-sm font-semibold text-white disabled:opacity-50"
          >
            <CreditCard size={16} />
            {isLoading ? 'Loading...' : 'Manage Billing & Payment Method'}
          </button>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Upgrade Options */}
      {availableUpgrades.length > 0 && (
        <div className="glass-card rounded-lg p-6 border border-[#1f2f45]">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white mb-1">Upgrade Your Plan</h3>
            <p className="text-xs text-[#7fa6d1]">Unlock more features and higher limits</p>
          </div>

          <div className="grid gap-4">
            {availableUpgrades.map((tier) => {
              const tierQuota = PLAN_QUOTAS[tier];
              const tierFrameScan = getFrameScanQuota(tier);

              return (
                <div
                  key={tier}
                  className="p-4 bg-[#0E0E0E] border border-[#2A2A2A] rounded-lg hover:border-[#4433FF]/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-bold text-white">
                        {PLAN_NAMES[tier]}
                      </div>
                      <div className="text-xl font-bold text-[#4433FF]">
                        ${PLAN_PRICES[tier]}
                        <span className="text-sm font-normal text-gray-500">/mo</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpgrade(tier)}
                      disabled={isLoading}
                      className="px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isLoading ? 'Loading...' : 'Upgrade'}
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-gray-500">
                      <span className="text-white font-semibold">
                        {tierFrameScan.daily === -1 ? '∞' : tierFrameScan.daily}
                      </span> scans/day
                    </div>
                    <div className="text-gray-500">
                      <span className="text-white font-semibold">
                        {tierQuota.aiQueriesDaily === -1 ? '∞' : tierQuota.aiQueriesDaily}
                      </span> AI/day
                    </div>
                    <div className="text-gray-500">
                      <span className="text-white font-semibold">
                        {tierQuota.contactsLimit === -1 ? '∞' : tierQuota.contactsLimit}
                      </span> contacts
                    </div>
                    <div className="text-gray-500">
                      <span className="text-white font-semibold">
                        {tierQuota.callAnalyzerMinutes === 0 ? '—' : tierQuota.callAnalyzerMinutes === -1 ? '∞' : tierQuota.callAnalyzerMinutes}
                      </span> call min
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Beta Notice */}
      {currentTier.startsWith('beta_') && (
        <div className="p-4 bg-[#4433FF]/10 border border-[#4433FF]/30 rounded-lg">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-[#4433FF] mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-white mb-1">Beta Program</div>
              <p className="text-xs text-[#7fa6d1]">
                You're part of our beta program with enhanced features. When we launch publicly,
                you'll transition to our production tiers with special beta pricing locked in.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface SettingsViewProps {
  selectedContactId: string;
  setSelectedContactId: (id: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  selectedContactId,
  setSelectedContactId,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const user = getContactZero();
  
  // Profile state
  const [profileData, setProfileData] = useState({
    fullName: user.fullName,
    email: user.email || '',
    phone: user.phone || '',
    company: user.company || '',
    title: user.title || '',
    location: user.location || '',
    linkedinUrl: user.linkedinUrl || '',
    xHandle: user.xHandle || '',
    avatarUrl: user.avatarUrl || '',
  });

  // Avatar upload ref
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  // Handle avatar file selection
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    // Convert to Data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setProfileData((prev) => ({ ...prev, avatarUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  // Appearance state
  const [darkMode, setDarkMode] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  // Notifications state
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [scanReminders, setScanReminders] = useState(false);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [googleCalLinked, setGoogleCalLinked] = useState(false);
  const [googleCalEmail, setGoogleCalEmail] = useState('');
  
  // API Keys state (for advanced users)
  const [openaiKey, setOpenaiKey] = useState('');
  const [nanoKey, setNanoKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'saved'>('idle');

  // System Log notification preferences
  const notificationSettings = getNotificationSettings();
  const [systemLogSettings, setSystemLogSettings] = useState(notificationSettings);

  // Privacy state
  const [dataSharing, setDataSharing] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  // Little Lord keyboard shortcut state
  const [llShortcut, setLLShortcut] = useState<LittleLordShortcutPreference>(
    getLittleLordShortcut()
  );
  const [shortcutSaved, setShortcutSaved] = useState(false);

  useEffect(() => {
    // Load settings using shared utility function
    const initialDark = getGlobalDarkMode();
    setDarkMode(initialDark);
    applyGlobalTheme(initialDark);
    
    const savedCompactMode = localStorage.getItem('framelord_compact_mode');
    if (savedCompactMode !== null) {
      const isCompact = savedCompactMode === 'true';
      setCompactMode(isCompact);
      applyCompactMode(isCompact);
    }
    
    const savedEmailNotifs = localStorage.getItem('framelord_email_notifications');
    if (savedEmailNotifs !== null) {
      setEmailNotifications(savedEmailNotifs === 'true');
    }
    
    const savedScanReminders = localStorage.getItem('framelord_scan_reminders');
    if (savedScanReminders !== null) {
      setScanReminders(savedScanReminders === 'true');
    }

    const savedGoogleCal = localStorage.getItem('framelord_google_cal');
    if (savedGoogleCal) {
      try {
        const parsed = JSON.parse(savedGoogleCal) as { linked: boolean; email: string };
        setGoogleCalLinked(Boolean(parsed.linked));
        setGoogleCalEmail(parsed.email || '');
      } catch {
        // ignore parse errors
      }
    }
    
    // Load API keys
    const userSettings = loadUserSettings();
    setOpenaiKey(userSettings.openaiApiKey ?? '');
    setNanoKey(userSettings.nanobananaApiKey ?? '');
  }, []);

  // API Key status labels
  const openaiStatusLabel = (() => {
    if (openaiKey.trim().length > 0) return 'Using your personal OpenAI key';
    const envKey = (import.meta as any).env?.VITE_OPENAI_API_KEY as string | undefined;
    if (envKey && envKey.trim().length > 0) return 'Using FrameLord system OpenAI key';
    return 'No OpenAI key configured';
  })();

  const nanoStatusLabel = (() => {
    if (nanoKey.trim().length > 0) return 'Using your personal NanoBanana key';
    const envKey = (import.meta as any).env?.VITE_NANOBANANA_API_KEY as string | undefined;
    if (envKey && envKey.trim().length > 0) return 'Using FrameLord system NanoBanana key';
    return 'No NanoBanana key configured';
  })();

  const handleSaveApiKeys = () => {
    const current = loadUserSettings();
    const next = {
      ...current,
      openaiApiKey: openaiKey.trim() || undefined,
      nanobananaApiKey: nanoKey.trim() || undefined,
    };
    saveUserSettings(next);
    setApiKeyStatus('saved');
    setTimeout(() => setApiKeyStatus('idle'), 1500);
  };

  const clearOpenAI = () => {
    const current = loadUserSettings();
    saveUserSettings({ ...current, openaiApiKey: undefined });
    setOpenaiKey('');
  };

  const clearNano = () => {
    const current = loadUserSettings();
    saveUserSettings({ ...current, nanobananaApiKey: undefined });
    setNanoKey('');
  };

  // Note: applyTheme is now imported from userSettings as applyGlobalTheme

  const applyCompactMode = (isCompact: boolean) => {
    const root = document.documentElement;
    if (isCompact) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }
  };

  const handleSaveProfile = () => {
    updateContact({
      ...user,
      ...profileData,
    });
    alert('Profile updated successfully');
  };

  const handleExportData = () => {
    // Export all data as JSON
    const data = {
      contacts: JSON.parse(localStorage.getItem('framelord_contacts') || '[]'),
      notes: JSON.parse(localStorage.getItem('framelord_notes') || '[]'),
      tasks: JSON.parse(localStorage.getItem('framelord_tasks') || '[]'),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `framelord-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const persistGoogleCal = (linked: boolean, email: string) => {
    localStorage.setItem('framelord_google_cal', JSON.stringify({ linked, email }));
  };

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This will permanently delete all your data. This action cannot be undone.'
    );
    if (confirmed) {
      const doubleConfirm = window.prompt(
        'Type "DELETE" to confirm account deletion:'
      );
      if (doubleConfirm === 'DELETE') {
        // Clear all localStorage
        localStorage.clear();
        alert('Account deleted. Please refresh the page.');
        window.location.reload();
      }
    }
  };

  const ToggleSwitch: React.FC<{
    enabled: boolean;
    onChange: (enabled: boolean) => void;
  }> = ({ enabled, onChange }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-[#4433FF]' : 'bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  const SettingCard: React.FC<{
    title: string;
    description: string;
    children: React.ReactNode;
  }> = ({ title, description, children }) => (
    <div className="glass-card rounded-lg p-6 border border-[#1f2f45]">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
        <p className="text-xs text-[#7fa6d1]">{description}</p>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">Settings</h1>
        <p className="text-sm text-gray-500">Manage your account and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#2A2A2A] overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'profile'
              ? 'text-white border-[#4433FF]'
              : 'text-gray-500 border-transparent hover:text-gray-300'
          }`}
        >
          <User size={16} />
          Profile
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'billing'
              ? 'text-white border-[#4433FF]'
              : 'text-gray-500 border-transparent hover:text-gray-300'
          }`}
        >
          <CreditCard size={16} />
          Billing
        </button>
        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'appearance'
              ? 'text-white border-[#4433FF]'
              : 'text-gray-500 border-transparent hover:text-gray-300'
          }`}
        >
          <Moon size={16} />
          Appearance
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'notifications'
              ? 'text-white border-[#4433FF]'
              : 'text-gray-500 border-transparent hover:text-gray-300'
          }`}
        >
          <Bell size={16} />
          Notifications
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'integrations'
              ? 'text-white border-[#4433FF]'
              : 'text-gray-500 border-transparent hover:text-gray-300'
          }`}
        >
          <LinkIcon size={16} />
          Integrations
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'privacy'
              ? 'text-white border-[#4433FF]'
              : 'text-gray-500 border-transparent hover:text-gray-300'
          }`}
        >
          <Shield size={16} />
          Privacy
        </button>
        <button
          onClick={() => setActiveTab('help')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'help'
              ? 'text-white border-[#4433FF]'
              : 'text-gray-500 border-transparent hover:text-gray-300'
          }`}
        >
          <HelpCircle size={16} />
          Help
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <SettingCard
              title="Profile Photo"
              description="Upload a photo to personalize your profile"
            >
              <div className="flex items-center gap-6">
                {/* Avatar Preview */}
                <div className="relative">
                  <img
                    src={profileData.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                    alt="Profile"
                    className="w-24 h-24 rounded-full border-2 border-[#333] object-cover"
                  />
                  {profileData.avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setProfileData((prev) => ({ ...prev, avatarUrl: '' }))}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 transition-colors"
                      title="Remove photo"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="space-y-2">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] text-white text-sm font-bold rounded-lg transition-colors"
                  >
                    Upload Photo
                  </button>
                  <p className="text-xs text-gray-500">
                    JPG, PNG, or GIF. Max 5MB.
                  </p>
                </div>
              </div>
            </SettingCard>

            <SettingCard
              title="Profile Information"
              description="Update your personal information and contact details"
            >
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                    className="w-full bg-[#1A1A1D] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full bg-[#1A1A1D] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full bg-[#1A1A1D] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                      Company
                    </label>
                    <input
                      type="text"
                      value={profileData.company}
                      onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                      className="w-full bg-[#1A1A1D] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                      Title
                    </label>
                    <input
                      type="text"
                      value={profileData.title}
                      onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
                      className="w-full bg-[#1A1A1D] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                    Location
                  </label>
                  <input
                    type="text"
                    value={profileData.location}
                    onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                    className="w-full bg-[#1A1A1D] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                      LinkedIn URL
                    </label>
                    <input
                      type="url"
                      value={profileData.linkedinUrl}
                      onChange={(e) => setProfileData({ ...profileData, linkedinUrl: e.target.value })}
                      className="w-full bg-[#1A1A1D] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                      X / Twitter Handle
                    </label>
                    <input
                      type="text"
                      value={profileData.xHandle}
                      onChange={(e) => setProfileData({ ...profileData, xHandle: e.target.value })}
                      className="w-full bg-[#1A1A1D] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
                      placeholder="@username"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center gap-2 px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] text-white text-sm font-bold rounded-lg transition-colors"
                >
                  <Save size={14} />
                  Save Changes
                </button>
              </div>
            </SettingCard>
          </div>
        )}

        {/* BILLING TAB */}
        {activeTab === 'billing' && (
          <BillingSection user={user} />
        )}

        {/* APPEARANCE TAB */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <SettingCard
              title="Appearance"
              description="Customize how FrameLord looks"
            >
              <div className="space-y-6">
                {/* Dark Mode toggle removed - app shell is locked to dark mode */}
                {/* Notes editor has its own theme toggle for editor content */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">Compact Mode</div>
                    <div className="text-xs text-gray-500">Reduce spacing for more content</div>
                  </div>
                  <ToggleSwitch
                    enabled={compactMode}
                    onChange={(enabled) => {
                      setCompactMode(enabled);
                      localStorage.setItem('framelord_compact_mode', String(enabled));
                      applyCompactMode(enabled);
                    }}
                  />
                </div>
              </div>
            </SettingCard>

            {/* Savage Mode Card */}
            <SettingCard
              title="Savage Mode"
              description="Enable brutally honest feedback from FrameScan and Little Lord"
            >
              <SavageModeToggle />
            </SettingCard>

            {/* Keyboard Shortcuts Card */}
            <SettingCard
              title="Keyboard Shortcuts"
              description="Configure keyboard shortcuts for quick access"
            >
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Crown size={16} className="text-[#4433FF]" />
                    <div className="text-sm font-semibold text-white">Little Lord Shortcut</div>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    Configure a dedicated keyboard shortcut to open Little Lord instantly. Disable this
                    if you experience conflicts with other system shortcuts or browser extensions.
                  </p>

                  <div className="space-y-4">
                    {/* Enable/Disable Toggle */}
                    <div className="flex items-center justify-between p-3 bg-[#0E0E0E] rounded-lg border border-[#2A2A2A]">
                      <div>
                        <div className="text-sm font-medium text-white">Enable Shortcut</div>
                        <div className="text-xs text-gray-500">
                          Allow keyboard shortcut to open Little Lord
                        </div>
                      </div>
                      <ToggleSwitch
                        enabled={llShortcut.enabled}
                        onChange={(enabled) => {
                          const updated = { ...llShortcut, enabled };
                          setLLShortcut(updated);
                          setLittleLordShortcut(updated);
                          setShortcutSaved(true);
                          setTimeout(() => setShortcutSaved(false), 2000);
                        }}
                      />
                    </div>

                    {/* Modifier Key Selection */}
                    {llShortcut.enabled && (
                      <>
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">
                            Modifier Key
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {(['meta', 'ctrl', 'alt', 'shift'] as const).map((mod) => (
                              <button
                                key={mod}
                                onClick={() => {
                                  const updated = { ...llShortcut, modifier: mod };
                                  setLLShortcut(updated);
                                  setLittleLordShortcut(updated);
                                  setShortcutSaved(true);
                                  setTimeout(() => setShortcutSaved(false), 2000);
                                }}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  llShortcut.modifier === mod
                                    ? 'bg-[#4433FF] text-white'
                                    : 'bg-[#1A1A1D] text-gray-400 hover:text-white border border-[#333]'
                                }`}
                              >
                                {mod === 'meta' && 'Cmd/⌘ (Mac)'}
                                {mod === 'ctrl' && 'Ctrl'}
                                {mod === 'alt' && 'Alt/⌥'}
                                {mod === 'shift' && 'Shift/⇧'}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-gray-600 mt-1">
                            Note: "meta" = Command on Mac, shows as Ctrl in browser on Windows
                          </p>
                        </div>

                        {/* Key Selection */}
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">
                            Key
                          </label>
                          <input
                            type="text"
                            value={llShortcut.key}
                            onChange={(e) => {
                              const key = e.target.value.toLowerCase().slice(-1);
                              if (key && /^[a-z]$/.test(key)) {
                                const updated = { ...llShortcut, key };
                                setLLShortcut(updated);
                                setLittleLordShortcut(updated);
                                setShortcutSaved(true);
                                setTimeout(() => setShortcutSaved(false), 2000);
                              }
                            }}
                            maxLength={1}
                            className="w-full bg-[#1A1A1D] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#4433FF] outline-none uppercase"
                            placeholder="L"
                          />
                          <p className="text-[10px] text-gray-600 mt-1">
                            Single letter only (a-z)
                          </p>
                        </div>

                        {/* Preview */}
                        <div className="p-3 bg-[#0E0E0E] rounded-lg border border-[#2A2A2A]">
                          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                            Current Shortcut
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1.5 bg-[#1A1A1D] border border-[#333] rounded text-xs font-mono text-white">
                              {llShortcut.modifier === 'meta' && '⌘'}
                              {llShortcut.modifier === 'ctrl' && 'Ctrl'}
                              {llShortcut.modifier === 'alt' && '⌥'}
                              {llShortcut.modifier === 'shift' && '⇧'}
                            </div>
                            <span className="text-gray-500">+</span>
                            <div className="px-3 py-1.5 bg-[#1A1A1D] border border-[#333] rounded text-xs font-mono text-white uppercase">
                              {llShortcut.key}
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-600 mt-2">
                            Press this combination anywhere in the app to open Little Lord
                          </p>
                        </div>
                      </>
                    )}

                    {/* Save Status */}
                    {shortcutSaved && (
                      <div className="flex items-center gap-2 text-xs text-green-400">
                        <Check size={14} />
                        Shortcut saved! Changes take effect immediately.
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px bg-[#2A2A2A]" />

                <div className="text-xs text-gray-500">
                  <p className="mb-2 font-semibold text-gray-400">Other Shortcuts:</p>
                  <ul className="space-y-1">
                    <li>
                      <span className="font-mono bg-[#1A1A1D] px-1.5 py-0.5 rounded text-[10px]">
                        Cmd+K → LL
                      </span>{' '}
                      - Command palette (always active)
                    </li>
                    <li>
                      <span className="font-mono bg-[#1A1A1D] px-1.5 py-0.5 rounded text-[10px]">
                        Esc
                      </span>{' '}
                      - Close Little Lord modal
                    </li>
                  </ul>
                </div>
              </div>
            </SettingCard>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <SettingCard
              title="Email & General Notifications"
              description="Manage your email and general notification preferences"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">Email Notifications</div>
                    <div className="text-xs text-gray-500">Receive weekly progress reports via email</div>
                  </div>
                  <ToggleSwitch
                    enabled={emailNotifications}
                    onChange={(enabled) => {
                      setEmailNotifications(enabled);
                      localStorage.setItem('framelord_email_notifications', String(enabled));
                    }}
                  />
                </div>
                <div className="h-px bg-[#2A2A2A]" />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">Scan Reminders</div>
                    <div className="text-xs text-gray-500">Get reminded to scan your communications regularly</div>
                  </div>
                  <ToggleSwitch
                    enabled={scanReminders}
                    onChange={(enabled) => {
                      setScanReminders(enabled);
                      localStorage.setItem('framelord_scan_reminders', String(enabled));
                    }}
                  />
                </div>
                <div className="h-px bg-[#2A2A2A]" />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">Weekly Reports</div>
                    <div className="text-xs text-gray-500">Receive weekly frame analysis summaries</div>
                  </div>
                  <ToggleSwitch
                    enabled={weeklyReports}
                    onChange={setWeeklyReports}
                  />
                </div>
              </div>
            </SettingCard>

            <SettingCard
              title="System Log Notifications"
              description="Control which notifications appear in the System Log panel"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">Owner Announcements</div>
                    <div className="text-xs text-gray-500">Updates and announcements from FrameLord team</div>
                  </div>
                  <ToggleSwitch
                    enabled={systemLogSettings.showAnnouncements}
                    onChange={(enabled) => {
                      const updated = updateNotificationSettings({ showAnnouncements: enabled });
                      setSystemLogSettings(updated);
                    }}
                  />
                </div>
                <div className="h-px bg-[#2A2A2A]" />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">System Events</div>
                    <div className="text-xs text-gray-500">Data sync, analysis completion, and system updates</div>
                  </div>
                  <ToggleSwitch
                    enabled={systemLogSettings.showSystemEvents}
                    onChange={(enabled) => {
                      const updated = updateNotificationSettings({ showSystemEvents: enabled });
                      setSystemLogSettings(updated);
                    }}
                  />
                </div>
                <div className="h-px bg-[#2A2A2A]" />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">Task Reminders</div>
                    <div className="text-xs text-gray-500">Notifications for due tasks and action items</div>
                  </div>
                  <ToggleSwitch
                    enabled={systemLogSettings.showTasks}
                    onChange={(enabled) => {
                      const updated = updateNotificationSettings({ showTasks: enabled });
                      setSystemLogSettings(updated);
                    }}
                  />
                </div>
                <div className="h-px bg-[#2A2A2A]" />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">
                      Billing Alerts
                      <span className="ml-2 text-[9px] px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded uppercase">
                        Mandatory
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">Payment reminders and subscription updates (always shown)</div>
                  </div>
                  <ToggleSwitch
                    enabled={systemLogSettings.showBillingAlerts}
                    onChange={(enabled) => {
                      // Billing alerts are mandatory, but we still allow the toggle for UI consistency
                      const updated = updateNotificationSettings({ showBillingAlerts: enabled });
                      setSystemLogSettings(updated);
                    }}
                  />
                </div>
                <div className="h-px bg-[#2A2A2A]" />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">Custom Alerts</div>
                    <div className="text-xs text-gray-500">User-defined rules and custom notifications</div>
                  </div>
                  <ToggleSwitch
                    enabled={systemLogSettings.showCustom}
                    onChange={(enabled) => {
                      const updated = updateNotificationSettings({ showCustom: enabled });
                      setSystemLogSettings(updated);
                    }}
                  />
                </div>
              </div>
            </SettingCard>
          </div>
        )}

        {/* INTEGRATIONS TAB */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            {/* FrameScan API Keys - Only show if advanced settings enabled */}
            {appConfig.enableAdvancedApiSettings && (
              <SettingCard
                title="FrameScan API Keys"
                description="Use personal API keys for FrameScan. Leave empty to use FrameLord system keys."
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-2 p-3 bg-[#4433FF]/10 border border-[#4433FF]/30 rounded-lg">
                    <Info size={14} className="text-[#4433FF] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[#7fa6d1]">
                      <strong className="text-[#4433FF]">For advanced users:</strong> Enter your own API keys to use your quota instead of FrameLord's system keys. Keys are stored locally in your browser.
                    </p>
                  </div>
                  
                  {/* OpenAI Key */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                      OpenAI API Key
                    </label>
                    <input
                      type="password"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-[#1A1A1D] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#4433FF] outline-none font-mono"
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[10px] ${openaiKey.trim() ? 'text-green-400' : 'text-gray-500'}`}>
                        {openaiStatusLabel}
                      </span>
                      {openaiKey.trim() && (
                        <button
                          onClick={clearOpenAI}
                          className="text-[10px] text-red-400 hover:text-red-300"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* NanoBanana Key */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                      NanoBanana API Key
                    </label>
                    <input
                      type="password"
                      value={nanoKey}
                      onChange={(e) => setNanoKey(e.target.value)}
                      placeholder="nb-..."
                      className="w-full bg-[#1A1A1D] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#4433FF] outline-none font-mono"
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[10px] ${nanoKey.trim() ? 'text-green-400' : 'text-gray-500'}`}>
                        {nanoStatusLabel}
                      </span>
                      {nanoKey.trim() && (
                        <button
                          onClick={clearNano}
                          className="text-[10px] text-red-400 hover:text-red-300"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Save Button */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSaveApiKeys}
                      className="flex items-center gap-2 px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] text-white text-sm font-bold rounded-lg transition-colors"
                    >
                      <Key size={14} />
                      Save Keys
                    </button>
                    {apiKeyStatus === 'saved' && (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <Check size={14} />
                        Saved!
                      </span>
                    )}
                  </div>
                </div>
              </SettingCard>
            )}

            <SettingCard
              title="Calendar Integrations"
              description="Link calendars to push tasks, scans, and notes as events"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">Google Calendar</div>
                    <div className="text-xs text-[#7fa6d1]">Enable write access to schedule directly from FrameLord.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {googleCalLinked && (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-[#0a2b3d] border border-[#1f2f45] text-[#8beaff]">
                        Connected
                      </span>
                    )}
                    <ToggleSwitch enabled={googleCalLinked} onChange={(enabled) => {
                      setGoogleCalLinked(enabled);
                      if (!enabled) {
                        setGoogleCalEmail('');
                        persistGoogleCal(false, '');
                      } else {
                        persistGoogleCal(true, googleCalEmail);
                      }
                    }} />
                  </div>
                </div>
                {googleCalLinked && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                      Google Account Email
                    </label>
                    <input
                      type="email"
                      value={googleCalEmail}
                      onChange={(e) => {
                        setGoogleCalEmail(e.target.value);
                        persistGoogleCal(true, e.target.value);
                      }}
                      onKeyDown={(e) => {
                        // Prevent Enter from triggering any parent behavior
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      placeholder="name@gmail.com"
                      autoComplete="off"
                      className="w-full bg-[#0a1020]/80 border border-[#1a2a3f] rounded-lg px-3 py-2 text-[#e0edff] text-sm focus:border-[#2ee0ff] outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="px-4 py-2 text-xs font-bold rounded-lg neon-button"
                        onClick={() => alert('Linking to Google Calendar... (local-first mock). State saved locally.')}
                      >
                        Link now
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 text-xs font-bold rounded-lg border border-[#1f2f45] text-[#7fa6d1]"
                        onClick={() => {
                          setGoogleCalLinked(false);
                          setGoogleCalEmail('');
                          persistGoogleCal(false, '');
                        }}
                      >
                        Disconnect
                      </button>
                    </div>
                    <p className="text-[11px] text-[#7fa6d1]">
                      Local-first only: status and email are stored locally. When we wire OAuth, this will trigger the consent flow.
                    </p>
                  </div>
                )}
              </div>
            </SettingCard>
          </div>
        )}

        {/* PRIVACY TAB */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <SettingCard
              title="Privacy & Data"
              description="Control how your data is used"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">Data Sharing</div>
                    <div className="text-xs text-gray-500">Allow anonymized data sharing for product improvement</div>
                  </div>
                  <ToggleSwitch
                    enabled={dataSharing}
                    onChange={setDataSharing}
                  />
                </div>
                <div className="h-px bg-[#2A2A2A]" />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">Analytics</div>
                    <div className="text-xs text-gray-500">Help us improve by sharing usage analytics</div>
                  </div>
                  <ToggleSwitch
                    enabled={analytics}
                    onChange={setAnalytics}
                  />
                </div>
              </div>
            </SettingCard>

            <SettingCard
              title="Data Management"
              description="Export or delete your data"
            >
              <div className="space-y-4">
                <button
                  onClick={handleExportData}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#1A1A1D] border border-[#333] rounded-lg hover:border-[#4433FF] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Download size={16} className="text-[#4433FF]" />
                    <div className="text-left">
                      <div className="text-sm font-semibold text-white">Export Data</div>
                      <div className="text-xs text-gray-500">Download all your data as JSON</div>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-gray-500" />
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#1A1A1D] border border-red-500/30 rounded-lg hover:border-red-500/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 size={16} className="text-red-500" />
                    <div className="text-left">
                      <div className="text-sm font-semibold text-red-500">Delete Account</div>
                      <div className="text-xs text-gray-500">Permanently delete all your data</div>
                    </div>
                  </div>
                  <AlertTriangle size={14} className="text-red-500" />
                </button>
              </div>
            </SettingCard>
          </div>
        )}

        {/* HELP TAB */}
        {activeTab === 'help' && (
          <div className="space-y-6">
            <SettingCard
              title="Help & Resources"
              description="Learn more about frame authority and improve your communication"
            >
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-[#1A1A1D] border border-[#333] rounded-lg">
                  <div className="w-12 h-12 rounded-lg bg-[#4433FF]/20 flex items-center justify-center flex-shrink-0">
                    <FileText size={24} className="text-[#4433FF]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white mb-2">The Apex Frame Book</h3>
                    <p className="text-xs text-gray-400 leading-relaxed mb-3">
                      Master the psychology and strategies of frame authority. Learn how to maintain control in professional communications and negotiations. This foundational resource teaches you the theory and principles behind effective frame management.
                    </p>
                    <a
                      href="https://theapexframe.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      Buy on theapexframe.com
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-[#1A1A1D] border border-[#333] rounded-lg">
                  <div className="w-12 h-12 rounded-lg bg-[#4433FF]/20 flex items-center justify-center flex-shrink-0">
                    <HelpCircle size={24} className="text-[#4433FF]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white mb-2">Personalized Coaching</h3>
                    <p className="text-xs text-gray-400 leading-relaxed mb-3">
                      Get real-time feedback from expert coaches who can help you master frame authority in your specific context. They'll work with you to identify weak patterns, provide actionable coaching, and help you achieve breakthrough results in your communication and influence.
                    </p>
                    <div className="text-xs text-gray-500 mb-3">Available for Pro and Elite tiers.</div>
                    <div className="flex flex-wrap gap-2">
                      {['Sales Calls', 'Emails', 'Presentations', 'Personal Branding'].map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-[#0E0E0E] border border-[#333] rounded-full text-xs text-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </SettingCard>

            <SettingCard
              title="Keyboard Shortcuts"
              description="Speed up your workflow"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-300">Save note</span>
                  <kbd className="px-2 py-1 bg-[#1A1A1D] border border-[#333] rounded text-xs text-gray-400">Enter</kbd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-300">New line in note</span>
                  <kbd className="px-2 py-1 bg-[#1A1A1D] border border-[#333] rounded text-xs text-gray-400">Shift + Enter</kbd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-300">Search</span>
                  <kbd className="px-2 py-1 bg-[#1A1A1D] border border-[#333] rounded text-xs text-gray-400">⌘K</kbd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-300">Create link</span>
                  <kbd className="px-2 py-1 bg-[#1A1A1D] border border-[#333] rounded text-xs text-gray-400">[[</kbd>
                </div>
              </div>
            </SettingCard>
          </div>
        )}
      </div>
    </div>
  );
};
