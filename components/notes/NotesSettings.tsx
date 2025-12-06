// =============================================================================
// NOTES SETTINGS - AFFiNE-style settings modal
// =============================================================================
// Complete settings interface with:
// - Appearance (theme, language, layout)
// - Editor (font size, spell check, default mode)
// - Keyboard Shortcuts (read-only reference)
// - Preference (auto-save, startup view)
// - Properties (visibility toggles for note metadata)
// =============================================================================

import React, { useState, useEffect } from 'react';
import { X, Monitor, Sun, Moon, ChevronDown } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface NotesSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChange?: (theme: 'light' | 'dark' | 'system') => void;
}

type SettingsTab = 'appearance' | 'editor' | 'shortcuts' | 'preference' | 'properties';
type ColorMode = 'system' | 'light' | 'dark';
type FontSize = 'small' | 'normal' | 'large';
type DefaultMode = 'page' | 'edgeless';
type StartupView = 'all' | 'journals' | 'last';
type PropertyVisibility = 'hide_empty' | 'always_hide' | 'always_show';

interface NotesSettingsData {
  // Appearance
  colorMode: ColorMode;
  displayLanguage: string;
  showLinkedDocs: boolean;
  fullWidthLayout: boolean;

  // Editor
  fontSize: FontSize;
  spellCheck: boolean;
  defaultMode: DefaultMode;

  // Preference
  autoSave: boolean;
  startupView: StartupView;

  // Properties
  properties: {
    tags: PropertyVisibility;
    docMode: PropertyVisibility;
    journal: PropertyVisibility;
    template: PropertyVisibility;
    created: 'always_show'; // locked
    updated: 'always_show'; // locked
  };
}

const DEFAULT_SETTINGS: NotesSettingsData = {
  colorMode: 'system',
  displayLanguage: 'English',
  showLinkedDocs: true,
  fullWidthLayout: false,
  fontSize: 'normal',
  spellCheck: true,
  defaultMode: 'page',
  autoSave: true,
  startupView: 'all',
  properties: {
    tags: 'hide_empty',
    docMode: 'always_hide',
    journal: 'always_hide',
    template: 'always_hide',
    created: 'always_show',
    updated: 'always_show',
  },
};

// =============================================================================
// KEYBOARD SHORTCUTS DATA
// =============================================================================

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], mac: ['⌘', 'K'], description: 'Quick search' },
  { keys: ['Ctrl', 'N'], mac: ['⌘', 'N'], description: 'New document' },
  { keys: ['Ctrl', '/'], mac: ['⌘', '/'], description: 'Toggle sidebar' },
  { keys: ['Ctrl', 'B'], mac: ['⌘', 'B'], description: 'Bold' },
  { keys: ['Ctrl', 'I'], mac: ['⌘', 'I'], description: 'Italic' },
  { keys: ['/'], mac: ['/'], description: 'Slash commands' },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const isMac = () => {
  if (typeof navigator === 'undefined') return false;
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
};

const loadSettings = (): NotesSettingsData => {
  try {
    const saved = localStorage.getItem('framelord_notes_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const saveSettings = (settings: NotesSettingsData) => {
  localStorage.setItem('framelord_notes_settings', JSON.stringify(settings));
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const NotesSettings: React.FC<NotesSettingsProps> = ({ isOpen, onClose, onThemeChange }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [settings, setSettings] = useState<NotesSettingsData>(loadSettings);

  // Save settings whenever they change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Apply theme changes
  useEffect(() => {
    if (onThemeChange) {
      const resolvedTheme = settings.colorMode === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : settings.colorMode;
      onThemeChange(resolvedTheme as 'light' | 'dark');
    }
  }, [settings.colorMode, onThemeChange]);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof NotesSettingsData>(key: K, value: NotesSettingsData[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updatePropertyVisibility = (prop: keyof NotesSettingsData['properties'], visibility: PropertyVisibility) => {
    setSettings(prev => ({
      ...prev,
      properties: { ...prev.properties, [prop]: visibility }
    }));
  };

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'appearance', label: 'Appearance' },
    { id: 'editor', label: 'Editor' },
    { id: 'shortcuts', label: 'Keyboard Shortcuts' },
    { id: 'preference', label: 'Preference' },
    { id: 'properties', label: 'Properties' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[80vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-gray-200 dark:border-gray-700 p-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h3>

                {/* Color Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Color mode
                  </label>
                  <div className="flex gap-3">
                    {(['system', 'light', 'dark'] as ColorMode[]).map(mode => (
                      <button
                        key={mode}
                        onClick={() => updateSetting('colorMode', mode)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                          settings.colorMode === mode
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {mode === 'system' && <Monitor size={16} />}
                        {mode === 'light' && <Sun size={16} />}
                        {mode === 'dark' && <Moon size={16} />}
                        <span className="capitalize">{mode}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Display Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display language
                  </label>
                  <div className="relative">
                    <select
                      value={settings.displayLanguage}
                      onChange={(e) => updateSetting('displayLanguage', e.target.value)}
                      className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white appearance-none cursor-pointer"
                    >
                      <option value="English">English</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={16} />
                  </div>
                </div>

                {/* Show Linked Docs */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Show linked docs</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Display bi-directional links in notes</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showLinkedDocs}
                      onChange={(e) => updateSetting('showLinkedDocs', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Full-Width Layout */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Full-width layout</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Use full width for note content</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.fullWidthLayout}
                      onChange={(e) => updateSetting('fullWidthLayout', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Editor</h3>

                {/* Font Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Font size
                  </label>
                  <div className="relative">
                    <select
                      value={settings.fontSize}
                      onChange={(e) => updateSetting('fontSize', e.target.value as FontSize)}
                      className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white appearance-none cursor-pointer"
                    >
                      <option value="small">Small</option>
                      <option value="normal">Normal</option>
                      <option value="large">Large</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={16} />
                  </div>
                </div>

                {/* Spell Check */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Spell check</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Enable spell checking while typing</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.spellCheck}
                      onChange={(e) => updateSetting('spellCheck', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Default Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Default mode
                  </label>
                  <div className="flex gap-3">
                    {(['page', 'edgeless'] as DefaultMode[]).map(mode => (
                      <button
                        key={mode}
                        onClick={() => updateSetting('defaultMode', mode)}
                        className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all capitalize ${
                          settings.defaultMode === mode
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h3>
                <div className="space-y-2">
                  {SHORTCUTS.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                      <div className="flex gap-1">
                        {(isMac() ? shortcut.mac : shortcut.keys).map((key, i) => (
                          <kbd
                            key={i}
                            className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'preference' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Preference</h3>

                {/* Auto-save */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-save</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Automatically save changes</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoSave}
                      onChange={(e) => updateSetting('autoSave', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Startup View */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Startup view
                  </label>
                  <div className="relative">
                    <select
                      value={settings.startupView}
                      onChange={(e) => updateSetting('startupView', e.target.value as StartupView)}
                      className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white appearance-none cursor-pointer"
                    >
                      <option value="all">All docs</option>
                      <option value="journals">Journals</option>
                      <option value="last">Last opened</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={16} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'properties' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Properties</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Control the visibility of note properties
                </p>

                <div className="space-y-4">
                  {/* Tags */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags</span>
                    <select
                      value={settings.properties.tags}
                      onChange={(e) => updatePropertyVisibility('tags', e.target.value as PropertyVisibility)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="hide_empty">Hide when empty</option>
                      <option value="always_hide">Always hide</option>
                      <option value="always_show">Always show</option>
                    </select>
                  </div>

                  {/* Doc Mode */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Doc mode</span>
                    <select
                      value={settings.properties.docMode}
                      onChange={(e) => updatePropertyVisibility('docMode', e.target.value as PropertyVisibility)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="always_hide">Always hide</option>
                      <option value="always_show">Always show</option>
                    </select>
                  </div>

                  {/* Journal */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Journal</span>
                    <select
                      value={settings.properties.journal}
                      onChange={(e) => updatePropertyVisibility('journal', e.target.value as PropertyVisibility)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="always_hide">Always hide</option>
                      <option value="always_show">Always show</option>
                    </select>
                  </div>

                  {/* Template */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Template</span>
                    <select
                      value={settings.properties.template}
                      onChange={(e) => updatePropertyVisibility('template', e.target.value as PropertyVisibility)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="always_hide">Always hide</option>
                      <option value="always_show">Always show</option>
                    </select>
                  </div>

                  {/* Created (locked) */}
                  <div className="flex items-center justify-between py-2 opacity-50">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Created</span>
                    <select
                      disabled
                      value={settings.properties.created}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-sm text-gray-900 dark:text-white cursor-not-allowed"
                    >
                      <option value="always_show">Always show</option>
                    </select>
                  </div>

                  {/* Updated (locked) */}
                  <div className="flex items-center justify-between py-2 opacity-50">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Updated</span>
                    <select
                      disabled
                      value={settings.properties.updated}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-sm text-gray-900 dark:text-white cursor-not-allowed"
                    >
                      <option value="always_show">Always show</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Export helper to get current settings
export const getNotesSettings = (): NotesSettingsData => {
  try {
    const saved = localStorage.getItem('framelord_notes_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};
