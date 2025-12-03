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
} from 'lucide-react';
import { CONTACT_ZERO, getContactZero, updateContact } from '../../services/contactStore';

type SettingsTab = 'profile' | 'billing' | 'appearance' | 'notifications' | 'privacy' | 'help';

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
  });

  // Appearance state
  const [darkMode, setDarkMode] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  // Notifications state
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [scanReminders, setScanReminders] = useState(false);
  const [weeklyReports, setWeeklyReports] = useState(true);

  // Privacy state
  const [dataSharing, setDataSharing] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  useEffect(() => {
    // Load settings from localStorage
    const savedDarkMode = localStorage.getItem('framelord_dark_mode');
    if (savedDarkMode !== null) {
      const isDark = savedDarkMode === 'true';
      setDarkMode(isDark);
      applyTheme(isDark);
    }
    
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
  }, []);

  const applyTheme = (isDark: boolean) => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove('light-mode');
      root.classList.add('dark-mode');
    } else {
      root.classList.remove('dark-mode');
      root.classList.add('light-mode');
    }
  };

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
    <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SettingCard
                title="Current Plan"
                description="Your active subscription"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-3 py-1 bg-[#4433FF]/20 text-[#4433FF] border border-[#4433FF]/30 rounded-full font-bold uppercase">
                      Free
                    </span>
                  </div>
                  <div>
                    <div className="text-3xl font-display font-bold text-white mb-1">$0</div>
                    <div className="text-xs text-gray-500">per month</div>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-[#2A2A2A]">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Check size={14} className="text-green-500" />
                      Unlimited contacts
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Check size={14} className="text-green-500" />
                      Unlimited notes
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Check size={14} className="text-green-500" />
                      Basic frame scanning
                    </div>
                  </div>
                  <button className="w-full px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] text-white text-sm font-bold rounded-lg transition-colors">
                    Upgrade Plan
                  </button>
                </div>
              </SettingCard>

              <SettingCard
                title="Billing Cycle"
                description="Your subscription details"
              >
                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                      Current Period
                    </div>
                    <div className="text-sm text-white">
                      {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                      Status
                    </div>
                    <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded font-bold uppercase">
                      Active
                    </span>
                  </div>
                </div>
              </SettingCard>
            </div>

            <SettingCard
              title="Usage This Period"
              description="Your quota resets on the next billing date"
            >
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white">Frame Scans</span>
                    <span className="text-sm text-gray-500">0 / Unlimited</span>
                  </div>
                  <div className="h-2 bg-[#1A1A1D] rounded-full overflow-hidden">
                    <div className="h-full bg-[#4433FF] rounded-full" style={{ width: '0%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white">Notes Created</span>
                    <span className="text-sm text-gray-500">Unlimited</span>
                  </div>
                </div>
              </div>
            </SettingCard>
          </div>
        )}

        {/* APPEARANCE TAB */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <SettingCard
              title="Appearance"
              description="Customize how FrameLord looks"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">Dark Mode</div>
                    <div className="text-xs text-gray-500">Switch between light and dark themes</div>
                  </div>
                  <ToggleSwitch
                    enabled={darkMode}
                    onChange={(enabled) => {
                      setDarkMode(enabled);
                      localStorage.setItem('framelord_dark_mode', String(enabled));
                      applyTheme(enabled);
                    }}
                  />
                </div>
                <div className="h-px bg-[#2A2A2A]" />
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
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <SettingCard
              title="Notifications"
              description="Manage your notification preferences"
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

