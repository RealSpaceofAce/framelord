
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  LayoutGrid, Scan, Users, Settings,
  TrendingUp, TrendingDown,
  Bot, Zap,
  Menu, ExternalLink, Shield, Lock,
  Plus, MoreHorizontal, X, Folder, ChevronDown,
  Upload, Image as ImageIcon, FileText, ArrowRight, AlertTriangle, Lightbulb,
  CheckCircle, Loader2, Paperclip, Mic, FileCode, Crosshair, Binary, Terminal, Cpu, GitCommit, Briefcase, Camera, Notebook, ArrowLeft, Clock as ClockIcon, User, Calendar, Target
} from 'lucide-react';
import './AppSidebarSkin.css';
import { SidebarParticles } from './notes/SidebarParticles';
import { SparkBorder } from './SparkSystem';
import { runTextFrameScan, type TextDomainId, FrameScanRejectionError } from '../lib/frameScan/frameScanLLM';
import { getLatestReport, getReportById } from '../services/frameScanReportStore';
import { useAudio } from '../hooks/useAudio';
import { showToast } from './Toast';
import { FrameAnalysisResult } from '../types';
import { Reveal } from './Reveal';
import { ContactsView } from './crm/ContactsView';
import { CasesView } from './crm/CasesView';
import { PipelinesView } from './crm/PipelinesView';
import { ProjectsView } from './crm/ProjectsView';
import { ProjectDetailView } from './crm/ProjectDetailView';
import { NotesView } from './crm/NotesView';
import { ContactDossierView } from './crm/ContactDossierView';
import { TopicView } from './crm/TopicView';
import { TasksView } from './crm/TasksView';
import { CalendarView } from './crm/CalendarView';
import { ActivityView } from './crm/ActivityView';
import { SettingsView } from './crm/SettingsView';
import { RetroClockPanel } from './RetroClockPanel';
import { getContactZero, CONTACT_ZERO, getContactById, getAllContacts } from '../services/contactStore';
import { getTopicById } from '../services/topicStore';
import { getAllNotes } from '../services/noteStore';
import {
  getAllTasks,
  getOpenTasksByDate,
  formatDueTime,
  hasTimeComponent,
} from '../services/taskStore'; // Calendar integration imports
import { getInteractionsByAuthorId, getInteractionsByContactId } from '../services/interactionStore';
import {
  getFilteredLogEntries,
  markLogEntryRead,
  markAllLogEntriesRead,
  getUnreadCount,
} from '../services/systemLogStore';
import {
  getTodayEvents,
  formatTime as formatEventTime,
  formatTimeRange,
  CalendarEvent,
} from '../services/calendarStore';
import { FrameScanPage } from './crm/FrameScanPage';
import { FrameScanReportDetail } from './crm/FrameScanReportDetail';
import { FrameScanReportLayout } from './framescan/FrameScanReportLayout';
import { FrameScoreTile } from './crm/FrameScoreTile';
import { PublicFrameScanPage } from '../pages/PublicFrameScanPage';
import { FrameReportDemoPage } from '../pages/FrameReportDemoPage';
import { FrameScanContextHelp } from './FrameScanContextHelp';
import { appConfig } from '../config/appConfig';
import { getContactZeroReports } from '../services/frameScanReportStore';
import {
  computeCumulativeFrameProfileForContact,
  computeFrameProfileTrend,
  getFrameScoreLabel,
  getFrameScoreColorClass,
  formatProfileDate,
} from '../lib/frameScan/frameProfile';
import { LittleLordProvider } from './littleLord';
import type { LittleLordViewId } from '../services/littleLord/types';

// Map Dashboard views to Little Lord view IDs
const mapViewToLittleLordViewId = (view: string): LittleLordViewId => {
  const mapping: Record<string, LittleLordViewId> = {
    'OVERVIEW': 'home',
    'DOSSIER': 'contact_dossier',
    'NOTES': 'notes',
    'SCAN': 'framescan',
    'FRAMESCAN': 'framescan',
    'FRAMESCAN_REPORT': 'framescan',
    'WANTS': 'wants',
    'CONTACTS': 'contacts',
    'TASKS': 'tasks',
    'CALENDAR': 'calendar',
    'PIPELINES': 'pipelines',
    'PROJECTS': 'projects',
    'SETTINGS': 'settings',
    'TOPIC': 'contacts',
  };
  return mapping[view] || 'home';
};
// FrameCanvasPage removed - canvas functionality now integrated into Notes (see REFACTOR_PLAN.md)
import { AffineNotes } from './notes';
import { WantsPage } from './wants';
import { useSavageMode } from '../hooks/useSavageMode';
import { Flame } from 'lucide-react';

const MotionDiv = motion.div as any;
const MotionAside = motion.aside as any;
const MotionPath = motion.path as any;

// STATIC OVERLAY EFFECT
const StaticOverlay: React.FC = () => (
  <div 
    className="absolute inset-0 pointer-events-none opacity-30"
    style={{
      backgroundImage: `
        repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(68, 51, 255, 0.1) 2px, rgba(68, 51, 255, 0.1) 4px),
        repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(68, 51, 255, 0.1) 2px, rgba(68, 51, 255, 0.1) 4px)
      `,
      backgroundSize: '4px 4px',
      animation: 'static 0.1s infinite',
    }}
  />
);

// ClockWidget with location fetching - used by RetroClockPanel
const ClockWidget: React.FC<{ time: Date }> = ({ time }) => {
  const [userLocation, setUserLocation] = useState<{ city: string; country: string; timezone: string } | null>(null);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        // Try ipapi.co first
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        if (data.city && data.country_name) {
          setUserLocation({
            city: data.city,
            country: data.country_name,
            timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
          return;
        }
      } catch (error) {
        console.log('ipapi.co failed, trying fallback');
      }

      // Fallback: use timezone to determine location
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const parts = tz.split('/');
        const city = parts[parts.length - 1].replace(/_/g, ' ');
        const region = parts[parts.length - 2] || '';

        setUserLocation({
          city: city,
          country: region || 'Unknown',
          timezone: tz,
        });
      } catch (error) {
        console.error('All location methods failed:', error);
        setUserLocation({
          city: 'Unknown',
          country: 'Unknown',
          timezone: 'UTC',
        });
      }
    };

    fetchLocation();
  }, []);

  return <RetroClockPanel time={time} userLocation={userLocation} />;
};

const ThingsDueWidget: React.FC = () => {
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Fetch calendar events and tasks
    const calendarEvents = getTodayEvents();
    const tasks = getOpenTasksByDate(todayStr);

    // Merge and create unified list
    type AgendaItem = {
        id: string;
        title: string;
        time: string;
        type: 'event' | 'task';
        sortTime: number;
    };

    const items: AgendaItem[] = [];

    // Add calendar events
    calendarEvents.forEach(event => {
        items.push({
            id: event.id,
            title: event.title,
            time: event.isAllDay ? 'All Day' : formatTimeRange(event.start, event.end),
            type: 'event',
            sortTime: event.start.getTime(),
        });
    });

    // Add tasks
    tasks.forEach(task => {
        const timeStr = hasTimeComponent(task.dueAt)
            ? formatDueTime(task.dueAt)
            : 'No time set';
        items.push({
            id: task.id,
            title: task.title,
            time: timeStr,
            type: 'task',
            sortTime: task.dueAt ? new Date(task.dueAt).getTime() : 0,
        });
    });

    // Sort by time (earliest first)
    items.sort((a, b) => a.sortTime - b.sortTime);

    return (
        <div className="h-[240px] shrink-0 border-b border-[#1c1c1c] overflow-y-auto p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
                <Calendar size={14} className="text-[#4433FF]" />
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Things Due Today
                </div>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-4">
                    <div className="text-xs text-gray-600">Nothing scheduled today</div>
                    <div className="text-[10px] text-gray-700 mt-1">You're all clear! 🎉</div>
                </div>
            ) : (
                items.map((item) => (
                    <div
                        key={item.id}
                        className="flex gap-2 items-start p-2 rounded border border-[#1c1c1c] bg-[#000000] hover:border-[#333] transition-colors"
                    >
                        {/* Type indicator */}
                        <div
                            className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                item.type === 'event' ? 'bg-blue-500' : 'bg-purple-500'
                            }`}
                        />
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white line-clamp-1">
                                {item.title}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                                <ClockIcon size={10} />
                                {item.time}
                            </div>
                        </div>
                        {/* Source badge */}
                        <div
                            className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                item.type === 'event'
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            }`}
                        >
                            {item.type === 'event' ? 'Cal' : 'Task'}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

const NotificationWidget: React.FC = () => {
    const [logEntries, setLogEntries] = useState(getFilteredLogEntries());
    const [refreshKey, setRefreshKey] = useState(0);

    // Refresh log entries when settings change
    useEffect(() => {
        setLogEntries(getFilteredLogEntries());
    }, [refreshKey]);

    // Poll for changes every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setRefreshKey((prev) => prev + 1);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'urgent':
                return 'bg-red-500';
            case 'warning':
                return 'bg-orange-500';
            case 'info':
            default:
                return 'bg-blue-500';
        }
    };

    const getSeverityBorder = (severity: string) => {
        switch (severity) {
            case 'urgent':
                return 'border-red-500/50';
            case 'warning':
                return 'border-orange-500/50';
            case 'info':
            default:
                return 'border-[#4433FF]/50';
        }
    };

    const handleMarkRead = (id: string) => {
        markLogEntryRead(id);
        setRefreshKey((prev) => prev + 1);
    };

    const handleMarkAllRead = () => {
        markAllLogEntriesRead();
        setRefreshKey((prev) => prev + 1);
    };

    const unreadCount = getUnreadCount();

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        System Log
                    </div>
                    {unreadCount > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-[#4433FF]/20 text-[#4433FF] border border-[#4433FF]/30 rounded font-bold">
                            {unreadCount}
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="text-[9px] text-gray-500 hover:text-white transition-colors uppercase tracking-wider"
                    >
                        Mark all read
                    </button>
                )}
            </div>

            {logEntries.length === 0 ? (
                <div className="text-center py-8">
                    <div className="text-xs text-gray-600">No notifications to show</div>
                    <div className="text-[10px] text-gray-700 mt-1">
                        Check Settings → Notifications to adjust filters
                    </div>
                </div>
            ) : (
                logEntries.map((entry) => (
                    <div
                        key={entry.id}
                        onClick={() => handleMarkRead(entry.id)}
                        className={`flex gap-3 items-start p-3 rounded border transition-colors cursor-pointer ${
                            entry.isRead
                                ? 'bg-[#000000] border-[#1c1c1c] hover:border-[#333]'
                                : 'bg-[#000000] border-[#1c1c1c] hover:' + getSeverityBorder(entry.severity)
                        }`}
                    >
                        <div
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getSeverityColor(
                                entry.severity
                            )} ${!entry.isRead ? 'animate-pulse' : ''}`}
                        />
                        <div className="flex-1 min-w-0">
                            <div className={`text-xs font-bold ${entry.isRead ? 'text-gray-500' : 'text-white'}`}>
                                {entry.title}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{entry.message}</div>
                            <div className="text-[9px] text-gray-700 mt-1">
                                {new Date(entry.createdAt).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                })}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

const ShootingStarBorder: React.FC<{ children: React.ReactNode, color?: string, className?: string }> = ({ children, color, className }) => {
    return (
        <div className={`relative group rounded-xl p-[1px] overflow-hidden ${className}`}>
            <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-${color === 'blue' ? 'blue-500' : 'white'}/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000`} style={{ background: `linear-gradient(90deg, transparent, ${color === 'blue' ? '#4433FF' : '#FFF'}, transparent)`}} />
            <div className="relative bg-[#000000] border border-[#1c1c1c] rounded-xl h-full">
                {children}
            </div>
        </div>
    );
};

const SpotlightCard: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;

    const div = divRef.current;
    const rect = div.getBoundingClientRect();

    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 z-10"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(68, 51, 255, 0.15), transparent 40%)`,
        }}
      />
      {children}
    </div>
  );
};

const EnergyFloor: React.FC = () => (
    <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-0 rounded-b-xl">
        <div className="absolute inset-0 bg-gradient-to-t from-[#4433FF]/20 via-[#4433FF]/5 to-transparent z-10" />
        {/* Removed overflow-hidden and local ThreeParticles to avoid clipping - app now has global particles */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#4433FF] shadow-[0_0_20px_#4433FF]" />
    </div>
);

const ScanView: React.FC = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [linkedContactId, setLinkedContactId] = useState<string | null>(null);
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Audio for scan sounds
  const { play, stop } = useAudio();

  // Savage Mode for FrameScan
  const { isEnabled: isSavageModeEnabled, toggle: toggleSavageMode } = useSavageMode();

  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useSpring(x);
  const mouseY = useSpring(y);
  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["3deg", "-3deg"]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-3deg", "3deg"]);

  // Get contacts for @ mentions
  const contacts = getAllContacts();
  const filteredContacts = contacts.filter(c => 
    c.fullName.toLowerCase().includes(contactSearchTerm.toLowerCase())
  ).slice(0, 5);
  const linkedContact = linkedContactId ? contacts.find(c => c.id === linkedContactId) : null;

  const handleMouseMove = (e: React.MouseEvent) => {
      if(!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      x.set((e.clientX - rect.left) / rect.width - 0.5);
      y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  // Handle @ mentions in textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart || 0;
    setInput(value);
    setCursorPosition(position);

    // Check if user just typed @
    const textBeforeCursor = value.substring(0, position);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (atMatch) {
      setShowContactPicker(true);
      setContactSearchTerm(atMatch[1] || '');
    } else {
      setShowContactPicker(false);
    }
  };

  const handleSelectContact = (contact: any) => {
    // Replace @searchterm with @ContactName
    const textBeforeCursor = input.substring(0, cursorPosition);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (atMatch) {
      const beforeAt = textBeforeCursor.substring(0, atMatch.index);
      const afterCursor = input.substring(cursorPosition);
      const newText = `${beforeAt}@${contact.fullName} ${afterCursor}`;
      setInput(newText);
      setLinkedContactId(contact.id);
    }
    
    setShowContactPicker(false);
    textareaRef.current?.focus();
  };

  // File upload handlers
  const processFile = (file: File) => {
    setUploadedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // For non-images, just store the file name for display
      setFilePreview(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleScan = async () => {
      if (!input.trim() && !uploadedFile) return;

      setLoading(true);
      setIsScanning(true);
      setScanComplete(false);

      // Play start sound and begin hum
      await play('scan_start');
      play('scan_hum', { loop: true, volume: 0.2 });

      try {
          // Determine domain from linked contact or default to generic
          const domain: TextDomainId = 'generic';

          // Run the actual FrameScan
          await runTextFrameScan({
            domain,
            content: input.trim(),
            contactId: linkedContactId || undefined,
            subjectLabel: 'Dashboard scan',
          });

          // Stop hum and play success
          stop('scan_hum');
          await play('scan_complete');

          // Get the newly created report
          const latestReport = getLatestReport();

          setIsScanning(false);
          setScanComplete(true);

          // Show toast with link to report
          showToast({
            type: 'success',
            title: 'FrameScan complete',
            message: 'Go to Frame Scans to view the full report',
          });

          // Clear input after successful scan
          setInput('');
          setLinkedContactId(null);
          clearFile();

          // Hide complete message after 5 seconds
          setTimeout(() => setScanComplete(false), 5000);
      } catch (e: any) {
          console.error('FrameScan error:', e);
          // Stop hum and play error
          stop('scan_hum');
          await play('error');

          // Check if this is a rejection (content not suitable for scan)
          if (e instanceof FrameScanRejectionError) {
            showToast({
              type: 'warning',
              title: 'Scan Rejected',
              message: e.rejectionReason,
            });
          } else {
            showToast({
              type: 'error',
              title: 'Scan failed',
              message: e?.message || 'An error occurred during the scan',
            });
          }

          setIsScanning(false);
      }
      finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 relative h-full flex flex-col justify-center">
       {/* Scanning Animation Overlay */}
       <AnimatePresence>
         {isScanning && (
           <MotionDiv
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] pointer-events-none"
           >
             {/* Scanning line */}
             <MotionDiv
               initial={{ top: 0 }}
               animate={{ top: ['0%', '100%', '0%'] }}
               transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
               className="absolute left-0 right-0 h-1"
               style={{
                 background: 'linear-gradient(90deg, transparent, #4433FF, #737AFF, #4433FF, transparent)',
                 boxShadow: '0 0 20px 10px rgba(68, 51, 255, 0.5), 0 0 60px 30px rgba(68, 51, 255, 0.3)',
               }}
             />
             {/* Glow overlay */}
             <MotionDiv
               initial={{ opacity: 0 }}
               animate={{ opacity: [0.05, 0.15, 0.05] }}
               transition={{ duration: 1, repeat: Infinity }}
               className="absolute inset-0 bg-[#4433FF]/10"
             />
           </MotionDiv>
         )}
       </AnimatePresence>

       {/* Scan Complete Message */}
       <AnimatePresence>
         {scanComplete && (
           <MotionDiv
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 bg-[#1E2028] border border-[#4433FF]/30 rounded-xl shadow-2xl"
           >
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-[#4433FF]/20 rounded-full flex items-center justify-center">
                 <Zap size={20} className="text-[#4433FF]" />
               </div>
               <div>
                 <h3 className="text-white font-medium">Frame Scan Complete</h3>
                 <p className="text-sm text-gray-400">You'll receive a notification when your detailed analysis is ready.</p>
               </div>
             </div>
           </MotionDiv>
         )}
       </AnimatePresence>

       <Reveal width="100%">
       <ShootingStarBorder color="blue">
       <SpotlightCard>
       <MotionDiv
         ref={ref}
         onMouseMove={handleMouseMove}
         style={{ rotateX, rotateY, transformStyle: "preserve-3d" } as any}
         className={`relative bg-[#1a1a2e]/60 backdrop-blur-2xl border rounded-xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden group min-h-[550px] flex flex-col ${
           isSavageModeEnabled ? 'savage-framescan' : 'border-[#4433FF]/30'
         }`}
       >
          <div className="absolute inset-0 pointer-events-none z-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(68, 51, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(68, 51, 255, 0.2) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          
          <div className="flex justify-between items-center mb-8 border-b border-[#4433FF]/20 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                  <Scan size={28} className="text-[#4433FF]" />
                  <h2 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-[#737AFF]">FRAME SCAN</h2>
                  <FrameScanContextHelp iconSize={18} />
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-[#737AFF]">
                  <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${loading ? 'bg-[#4433FF] animate-ping' : 'bg-[#0043ff]'}`} />
                      {loading ? 'ANALYZING...' : 'SYSTEM READY'}
                  </div>
                  <button
                    onClick={toggleSavageMode}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded font-bold uppercase transition-all ${
                      isSavageModeEnabled
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-[#4433FF]/20 text-[#4433FF] border border-transparent hover:border-[#4433FF]/30'
                    }`}
                    title={isSavageModeEnabled ? 'Disable brutal feedback mode' : 'Enable brutal feedback mode'}
                  >
                    <Flame size={12} />
                    {isSavageModeEnabled ? 'Savage ON' : 'Savage OFF'}
                  </button>
              </div>
          </div>

          {/* Linked Contact Badge */}
          {linkedContact && (
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <span className="text-xs text-gray-500">LINKED TO:</span>
              <div className="flex items-center gap-2 bg-[#4433FF]/20 px-3 py-1.5 rounded-full">
                <div className="w-5 h-5 bg-[#4433FF] rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {linkedContact.fullName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-white font-medium">{linkedContact.fullName}</span>
                <button 
                  onClick={() => setLinkedContactId(null)}
                  className="ml-1 text-gray-400 hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          <div
            className={`relative z-10 flex-1 transition-all duration-200 ${isDragging ? 'scale-[1.02] ring-2 ring-[#4433FF] ring-offset-2 ring-offset-[#0A0A1F]' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
              {/* File Preview - shown when file is uploaded */}
              {uploadedFile ? (
                <div className="w-full h-64 bg-[#0A0A1F]/60 border border-[#4433FF]/50 rounded-lg overflow-hidden relative group/preview">
                  {/* Image Preview */}
                  {filePreview && uploadedFile.type.startsWith('image/') ? (
                    <div className="relative w-full h-full">
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="w-full h-full object-contain opacity-90 group-hover/preview:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A1F]/90 to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col justify-end p-6">
                        <p className="text-white font-display text-sm mb-1">
                          <span className="text-[#4433FF]">ANALYSIS MODE:</span> VISUAL FRAME
                        </p>
                        <p className="text-[#737AFF] text-xs font-mono truncate">{uploadedFile.name}</p>
                      </div>
                      {/* Scanning border animation */}
                      <div className="absolute inset-0 border-2 border-[#4433FF]/50 rounded-lg pointer-events-none" />
                      <div className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden">
                        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#4433FF] to-transparent animate-pulse" style={{ top: '50%' }} />
                      </div>
                    </div>
                  ) : (
                    /* Non-image file preview */
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center p-6">
                        <div className="w-16 h-16 mx-auto mb-4 bg-[#4433FF]/20 rounded-lg flex items-center justify-center border border-[#4433FF]/30">
                          <FileText size={32} className="text-[#4433FF]" />
                        </div>
                        <p className="text-white font-medium text-sm mb-1 truncate max-w-[200px] mx-auto">{uploadedFile.name}</p>
                        <p className="text-[#737AFF] text-xs">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                  )}
                  {/* Clear button */}
                  <button
                    onClick={clearFile}
                    className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-red-500/80 text-white rounded-full transition-colors backdrop-blur-md border border-white/10 z-10"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                /* Textarea - shown when no file */
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    placeholder="PASTE TEXT, OR DROP IMAGE/AUDIO/DOCS HERE TO SCAN... Use @ to link a contact for context."
                    className="w-full h-48 bg-[#0A0A1F]/60 border border-[#4433FF]/30 rounded-lg p-6 text-white placeholder-[#737AFF]/50 focus:outline-none focus:border-[#4433FF] transition-all font-mono text-sm resize-none shadow-inner"
                />
              )}

              {/* Context input when file is uploaded */}
              {uploadedFile && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Add context: who, what, when, why (e.g., 'My LinkedIn photo, checking if it projects authority')..."
                    className="w-full bg-[#0A0A1F]/60 border border-[#4433FF]/30 rounded-lg p-4 text-white placeholder-[#737AFF]/50 focus:outline-none focus:border-[#4433FF] font-mono text-sm"
                  />
                </div>
              )}

              {/* Contact Picker Dropdown */}
              {!uploadedFile && showContactPicker && filteredContacts.length > 0 && (
                <div className="absolute left-6 top-52 bg-[#1E2028] border border-[#4433FF]/30 rounded-lg shadow-xl z-50 w-64 max-h-48 overflow-auto">
                  {filteredContacts.map(contact => (
                    <button
                      key={contact.id}
                      onClick={() => handleSelectContact(contact)}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-[#4433FF]/20 transition-colors"
                    >
                      <div className="w-8 h-8 bg-[#4433FF]/30 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {contact.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm text-white font-medium">{contact.fullName}</div>
                        {contact.email && <div className="text-xs text-gray-500">{contact.email}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Upload button - only shown when no file */}
              {!uploadedFile && (
                <div className="absolute bottom-4 right-4 flex gap-2">
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf,.doc,.docx,.txt" />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-[#4433FF]/20 hover:bg-[#4433FF] border border-[#4433FF] text-white text-xs font-bold px-3 py-1.5 rounded transition-all">
                        <Upload size={12} /> UPLOAD FILES
                    </button>
                </div>
              )}
          </div>

          {/* Context reminder microcopy */}
          <p className="mt-3 text-xs text-[#737AFF]/70 text-center">
            Briefly describe who, what, when, and why. Scans without context may be rejected.
          </p>

          <div className="mt-6 flex justify-center relative z-20">
              <button
                onClick={handleScan}
                disabled={loading || (!input.trim() && !uploadedFile)}
                className="relative overflow-hidden group/btn px-12 py-5 bg-[#4433FF] rounded-lg text-white font-display font-bold tracking-[0.15em] text-lg shadow-[0_0_30px_rgba(68,51,255,0.6)] hover:scale-105 transition-all disabled:opacity-50"
              >
                  <span className="relative z-10 flex items-center gap-3">
                      {loading ? <Loader2 className="animate-spin" /> : <Zap className="fill-white" />} INITIATE SCAN
                  </span>
              </button>
          </div>

          <EnergyFloor />

       </MotionDiv>
       </SpotlightCard>
       </ShootingStarBorder>
       </Reveal>
       
       {/* Scan Complete Message */}
       <AnimatePresence>
            {scanComplete && (
                <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mt-8 text-center"
                >
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-400 font-medium">Scan complete! View report in Frame Scans.</span>
                </div>
                </MotionDiv>
            )}
        </AnimatePresence>
    </div>
  );
}

// --- TYPE DEFINITIONS ---
interface OverviewMetricPoint {
    ts: number;          // Unix timestamp
    label: string;       // Display label (e.g., "12/01" or "Jan")
    scans: number;       // Number of scans/interactions
    actions: number;     // Number of actions (tasks + notes)
    score: number;       // Frame score (0-100)
}

interface SelectedDataPoint {
    index: number;
    label: string;
    scans: number;
    actions: number;
    score: number;
}

// --- FRAME INTEGRITY WIDGET (with robot GIF) ---
const FrameIntegrityWidget: React.FC = () => {
    const user = getContactZero();
    const reports = getContactZeroReports();
    const profile = computeCumulativeFrameProfileForContact(CONTACT_ZERO.id, reports);
    const allTasks = getAllTasks();
    
    // Calculate metrics based on actual app data - with safe defaults
    let frameIntegrity = 50;
    let scansCompleted = 0;
    let frameLeaks = 0;
    
    try {
        frameIntegrity = profile?.currentFrameScore || 50;
        scansCompleted = profile?.scansCount || 0;
        
        // Frame Leaks: Count of incongruent actions from Contact Zero
        // This includes: overdue tasks, missed commitments, uncompleted high-priority items
        const overdueTasks = allTasks.filter(t =>
          t.contactId === CONTACT_ZERO.id &&
          t.dueAt &&
          new Date(t.dueAt) < new Date() &&
          t.status !== 'done'
        ).length;

        // Also count from reports: look for low frame scores
        const lowFrameScoreReports = reports.filter(r =>
          r.score && r.score.frameScore && r.score.frameScore < 60
        ).length;
        
        // Frame leaks = overdue tasks + low frame score patterns detected
        frameLeaks = overdueTasks + lowFrameScoreReports;
    } catch (e) {
        console.error('FrameIntegrityWidget error:', e);
    }
    
    return (
        <div className="bg-[#000000] rounded-xl p-6 relative overflow-hidden h-full border border-[#1c1c1c]" style={{ minHeight: '320px' }}>
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#0043ff] rounded-sm animate-pulse" />
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#0043ff] font-mono">Frame Integrity</h3>
                </div>
                <div className="text-[10px] text-[#0043ff] font-bold border border-[#0043ff] px-3 py-1 rounded font-mono">ONLINE</div>
            </div>

            {/* Main Content - Stats on left, Robot on right */}
            <div className="flex items-center">
                {/* Left: Stats Stack */}
                <div className="space-y-3 w-[140px] flex-shrink-0">
                    {/* Frame Score */}
                    <div className="p-3 border border-[#0043ff]/50 bg-[#000000] rounded">
                        <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-1.5 h-1.5 bg-[#0043ff] rounded-sm" />
                            <span className="text-[10px] text-[#0043ff] font-bold uppercase tracking-wider font-mono">Frame Score</span>
                        </div>
                        <div className="text-3xl font-display font-bold text-[#0043ff]">{frameIntegrity}</div>
                        <div className="text-[9px] text-[#0043ff]/60 font-mono">[OUT OF 100]</div>
                    </div>

                    {/* Scans Completed */}
                    <div className="p-3 border border-[#0043ff]/50 bg-[#000000] rounded">
                        <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-1.5 h-1.5 bg-[#0043ff] rounded-sm" />
                            <span className="text-[10px] text-[#0043ff] font-bold uppercase tracking-wider font-mono">Scans Done</span>
                        </div>
                        <div className="text-3xl font-display font-bold text-[#0043ff]">{scansCompleted}</div>
                        <div className="text-[9px] text-[#0043ff]/60 font-mono">[COMPLETED]</div>
                    </div>

                    {/* Frame Leaks */}
                    <div className="p-3 border border-orange-500/50 bg-[#000000] rounded">
                        <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-sm" />
                            <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider font-mono">Frame Leaks</span>
                        </div>
                        <div className="text-3xl font-display font-bold text-orange-500">{frameLeaks}</div>
                        <div className="text-[9px] text-orange-500/60 font-mono">[INCONGRUENT]</div>
                    </div>
                </div>

                {/* Right: Robot GIF - Large and centered */}
                <div className="flex-1 flex items-center justify-center pl-4">
                    <img 
                        src="/bot_greenprint.gif" 
                        alt="Frame Guardian" 
                        className="h-[260px] w-auto"
                        style={{ 
                            filter: 'drop-shadow(0 0 15px rgba(50, 205, 50, 0.25))',
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

// --- REBELS RANKING WIDGET (Connected to Contact Data) ---
const RebelsRankingWidget: React.FC = () => {
    const contacts = getAllContacts();
    const allTasks = getAllTasks();
    const allNotes = getAllNotes();
    
    // Calculate "rebel points" for each contact based on activity
    // Points come from: tasks completed, notes created, interactions, frame scans
    const rankedContacts = useMemo(() => {
        try {
            return contacts
                .filter(c => c.id !== CONTACT_ZERO.id) // Exclude Contact Zero
                .map(contact => {
                    // Get activity metrics for this contact
                    const contactTasks = allTasks.filter(t => t.contactId === contact.id);
                    const completedTasks = contactTasks.filter(t => t.status === 'done').length;
                    const contactNotes = allNotes.filter(n => n.contactId === contact.id);
                    const contactInteractions = getInteractionsByContactId(contact.id);
                    
                    // Calculate points: 10 per completed task, 5 per note, 3 per interaction
                    const points = (completedTasks * 10) + (contactNotes.length * 5) + (contactInteractions.length * 3);
                    
                    // Calculate streak (consecutive weeks with activity)
                    const streak = Math.min(Math.floor(points / 30), 52); // Max 52 weeks
                    
                    return {
                        ...contact,
                        points,
                        streak,
                        isNew: false, // TODO: Need to track contact creation date in Contact type
                    };
                })
                .sort((a, b) => b.points - a.points)
                .slice(0, 5); // Top 5
        } catch (e) {
            console.error('RebelsRankingWidget error:', e);
            return [];
        }
    }, [contacts, allTasks, allNotes]);

    const newCount = rankedContacts.filter(c => c.isNew).length;

    return (
        <div className="bg-[#000000] border border-[#1c1c1c] rounded-xl p-6 relative overflow-hidden h-full">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-blue-500">
                    <div className="w-2 h-2 bg-blue-500 rounded-sm" />
                    <h3 className="text-xs font-bold uppercase tracking-widest">Rebels Ranking</h3>
                </div>
                {newCount > 0 && (
                    <div className="text-[9px] bg-[#333] text-orange-500 px-2 py-0.5 rounded font-bold border border-orange-500/30">
                        {newCount} NEW
                    </div>
                )}
            </div>
            
            <div className="space-y-2">
                {rankedContacts.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-sm">
                        Add contacts to see rankings
                    </div>
                ) : (
                    rankedContacts.map((contact, idx) => (
                        <div key={contact.id} className="flex items-center justify-between bg-[#000000] p-3 rounded border border-[#1c1c1c]">
                            <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 ${idx === 0 ? 'bg-blue-600' : idx === 1 ? 'bg-gray-600' : 'bg-gray-700'} rounded flex items-center justify-center text-xs font-bold text-white`}>
                                    {idx + 1}
                                </div>
                                <div className="w-8 h-8 bg-gray-700 rounded-full overflow-hidden flex items-center justify-center">
                                    {contact.avatarUrl ? (
                                        <img src={contact.avatarUrl} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs font-bold text-gray-400">
                                            {contact.fullName.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-white">
                                        {contact.fullName.toUpperCase()} 
                                        {contact.isNew && <span className="ml-1 text-orange-500">🆕</span>}
                                    </div>
                                    <div className="text-[9px] text-gray-500">
                                        {contact.streak > 0 ? `${contact.streak} WEEK${contact.streak > 1 ? 'S' : ''} STREAK 🔥` : 'NEW REBEL'}
                                    </div>
                                </div>
                            </div>
                            <div className={`${idx === 0 ? 'bg-blue-600' : 'bg-gray-700'} text-white text-[10px] font-bold px-2 py-1 rounded`}>
                                {contact.points} PTS
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// Helper to get folder display name
const getFolderDisplayName = (folderId: string): string => {
  switch (folderId) {
    case 'inbox': return 'Inbox';
    case DEFAULT_FOLDERS.PROJECTS: return 'Projects';
    case DEFAULT_FOLDERS.AREAS: return 'Areas';
    case DEFAULT_FOLDERS.RESOURCES: return 'Resources';
    case DEFAULT_FOLDERS.ARCHIVE: return 'Archive';
    default: return folderId;
  }
};

// --- DASHBOARD OVERVIEW (Rich - Binds to Contact Zero) ---
const DashboardOverview: React.FC = () => {
    const user = getContactZero();
    const reports = getContactZeroReports();
    const profile = computeCumulativeFrameProfileForContact(CONTACT_ZERO.id, reports);
    const allTasks = getAllTasks();
    
    // Calculate actual metrics from Contact Zero's data - with safe defaults
    let tasksDue = 0;
    let scansDone = 0;
    let leaks = 0;
    
    try {
        tasksDue = allTasks.filter(t =>
          t.contactId === CONTACT_ZERO.id &&
          t.dueAt &&
          new Date(t.dueAt) > new Date() &&
          new Date(t.dueAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
          t.status !== 'done'
        ).length;

        // Scans completed from actual reports
        scansDone = profile?.scansCount || 0;

        // Frame leaks: overdue tasks + low frame score patterns
        const overdueTasks = allTasks.filter(t =>
          t.contactId === CONTACT_ZERO.id &&
          t.dueAt &&
          new Date(t.dueAt) < new Date() &&
          t.status !== 'done'
        ).length;
        const lowFrameScoreReports = reports.filter(r =>
          r.score && r.score.frameScore && r.score.frameScore < 60
        ).length;
        leaks = overdueTasks + lowFrameScoreReports;
    } catch (e) {
        console.error('DashboardOverview metrics error:', e);
    }
    
    const [chartRange, setChartRange] = useState<'week' | 'month' | 'year'>('week');
    const [selectedDataPoint, setSelectedDataPoint] = useState<SelectedDataPoint | null>(null);
    const selectedContact = getContactZero();

    const buildPath = (coords: { x: number; y: number }[]): string => {
        if (coords.length === 0) return '';
        return coords.reduce((acc, { x, y }, idx) => {
            return idx === 0 ? `M${x},${y}` : `${acc} L${x},${y}`;
        }, '');
    };

    const chartData = useMemo<OverviewMetricPoint[]>(() => {
        try {
            const now = new Date();

            const getRangeStart = (range: typeof chartRange): Date => {
                const d = new Date(now);
                if (range === 'week') d.setDate(d.getDate() - 6);
                if (range === 'month') d.setDate(d.getDate() - 29);
                if (range === 'year') d.setMonth(d.getMonth() - 11);
                return d;
            };

            const rangeStart = getRangeStart(chartRange);
            const bucketCount = chartRange === 'year' ? 12 : chartRange === 'month' ? 30 : 7;

            const buckets: OverviewMetricPoint[] = [];
            const dayMs = 24 * 60 * 60 * 1000;

            for (let i = 0; i < bucketCount; i++) {
                const d = new Date(rangeStart);
                if (chartRange === 'year') d.setMonth(rangeStart.getMonth() + i);
                else d.setDate(rangeStart.getDate() + i);
                buckets.push({
                    ts: d.getTime(),
                    label: chartRange === 'year'
                        ? d.toLocaleDateString('en-US', { month: 'short' })
                        : `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
                    scans: 0,
                    actions: 0,
                    score: 0,
                });
            }

            const clampToBucket = (dateStr?: string | null) => {
                if (!dateStr) return -1;
                const ts = new Date(dateStr).getTime();
                if (Number.isNaN(ts)) return -1;
                if (ts < rangeStart.getTime() || ts > now.getTime()) return -1;
                if (chartRange === 'year') {
                    const monthsDiff = (new Date(ts).getFullYear() - rangeStart.getFullYear()) * 12 + (new Date(ts).getMonth() - rangeStart.getMonth());
                    return Math.min(Math.max(monthsDiff, 0), bucketCount - 1);
                }
                const daysDiff = Math.floor((ts - rangeStart.getTime()) / dayMs);
                return Math.min(Math.max(daysDiff, 0), bucketCount - 1);
            };

            // Scans: interactions by Contact Zero - add realistic variation
            const interactions = getInteractionsByAuthorId(CONTACT_ZERO.id);
            interactions.forEach((int) => {
                const idx = clampToBucket(int.occurredAt);
                if (idx >= 0) buckets[idx].scans += 1;
            });

            // Add mock variation to scans to ensure visible data
            buckets.forEach((b, i) => {
                const baseScans = 3 + Math.floor(Math.random() * 8);
                const variation = Math.sin(i * 0.5) * 4;
                b.scans = Math.max(1, b.scans + baseScans + Math.floor(variation));
            });

            // Actions: tasks due or created + notes - add realistic variation
            const tasks = getAllTasks();
            tasks.forEach((task) => {
                const idx = clampToBucket(task.dueAt || task.createdAt);
                if (idx >= 0) buckets[idx].actions += 1;
            });
            const notes = getAllNotes();
            notes.forEach((note) => {
                const idx = clampToBucket(note.createdAt);
                if (idx >= 0) buckets[idx].actions += 1;
            });

            // Add mock variation to actions to ensure visible data
            buckets.forEach((b, i) => {
                const baseActions = 2 + Math.floor(Math.random() * 5);
                const variation = Math.cos(i * 0.6) * 2;
                b.actions = Math.max(1, b.actions + baseActions + Math.floor(variation));
            });

            // Score: baseline from frame score, add meaningful variation
            const baseScore = selectedContact.frame.currentScore || 75;
            buckets.forEach((b, i) => {
                // Create more pronounced variation for score
                const activityBoost = (b.scans * 0.5 + b.actions * 0.3);
                const trendVariation = Math.sin(i * 0.3) * 8;
                const randomVariation = (Math.random() - 0.5) * 6;

                let score = baseScore + activityBoost + trendVariation + randomVariation;
                score = Math.max(40, Math.min(95, score));
                b.score = Math.round(score);
            });

            // If there is not enough data, seed with a minimal baseline so chart renders
            if (buckets.length < 2) {
                const nowTs = now.getTime();
                return [
                    { ts: nowTs - 24 * 60 * 60 * 1000, label: 'T-1', scans: 5, actions: 3, score: baseScore - 2 },
                    { ts: nowTs, label: 'Today', scans: 8, actions: 4, score: baseScore + 2 },
                ];
            }

            return buckets;
        } catch (e) {
            console.error('Chart data error', e);
            const now = Date.now();
            return [
                { ts: now - 24 * 60 * 60 * 1000, label: 'T-1', scans: 5, actions: 3, score: 70 },
                { ts: now, label: 'Today', scans: 8, actions: 4, score: 72 },
            ];
        }
    }, [chartRange, selectedContact.frame.currentScore]);

    return (
        <div className="space-y-6 h-full flex flex-col pb-20">
            {/* KPI ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SparkBorder className="h-full" color="blue">
                    <div className="bg-[#000000] p-6 rounded-xl h-full flex flex-col justify-between group hover:bg-[#111111] transition-colors border border-[#1c1c1c]">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Scans Completed</h3>
                                </div>
                                                            <div className="text-5xl font-display font-bold text-white">{scansDone}</div>
                                                        </div>
                                                        <Settings size={16} className="text-gray-700" onClick={() => alert('Coming soon')} />                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <span className="text-xs text-gray-600">WEEKLY SCOPE</span>
                            <TrendingUp size={20} className="text-blue-500" />
                        </div>
                    </div>
                </SparkBorder>

                <SparkBorder className="h-full">
                    <div className="bg-[#000000] p-6 rounded-xl h-full flex flex-col justify-between group hover:bg-[#111111] transition-colors border border-[#1c1c1c]">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Frame Leaks</h3>
                                </div>
                                <div className="text-5xl font-display font-bold text-white">{leaks}</div>
                            </div>
                            <Settings size={16} className="text-gray-700" onClick={() => alert('Coming soon')} />
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <span className="text-xs text-gray-600">IN VALIDATION TRAPS</span>
                            <TrendingDown size={20} className="text-orange-500" />
                        </div>
                    </div>
                </SparkBorder>

                <SparkBorder className="h-full">
                    <div className="bg-[#000000] p-6 rounded-xl h-full flex flex-col justify-between group hover:bg-[#111111] transition-colors border border-[#1c1c1c]">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Actions Due</h3>
                                </div>
                                <div className="text-5xl font-display font-bold text-white">{tasksDue}</div>
                            </div>
                            <Settings size={16} className="text-gray-700" onClick={() => alert('Coming soon')} />
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <span className="text-xs text-gray-600">4 WEEKS 🔥 STREAK</span>
                        </div>
                    </div>
                </SparkBorder>
            </div>

            {/* CHART SECTION */}
            <SparkBorder className="flex-1 min-h-[300px]" color="blue">
                <div className="bg-[#000000] border border-[#1c1c1c] rounded-xl p-6 h-full flex flex-col relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <div className="flex gap-4">
                            {(['week','month','year'] as const).map(range => (
                              <button
                                key={range}
                                onClick={() => setChartRange(range)}
                                className={`px-3 py-1 text-[10px] font-bold rounded uppercase transition-colors ${
                                  chartRange === range
                                    ? 'bg-[#4433FF] text-white'
                                    : 'text-gray-600 hover:text-white'
                                }`}
                              >
                                {range.toUpperCase()}
                              </button>
                            ))}
                        </div>
                        <div className="flex gap-6 text-[10px] font-bold uppercase tracking-wider">
                            <div className="flex items-center gap-2 text-blue-500"><div className="w-2 h-2 rotate-45 bg-blue-500" /> Scans</div>
                            <div className="flex items-center gap-2 text-purple-500"><div className="w-2 h-2 rotate-45 bg-purple-500" /> Actions</div>
                            <div className="flex items-center gap-2 text-orange-500"><div className="w-2 h-2 rotate-45 bg-orange-500" /> Score</div>
                        </div>
                    </div>

                    <div className="flex-1 relative w-full h-full flex items-end">
                        <div className="absolute inset-0 flex justify-between pointer-events-none">
                            {chartData.map((_, i) => (
                                <div key={i} className="h-full w-px bg-[#222] border-r border-dashed border-[#333]" />
                            ))}
                        </div>
                        {(() => {
                          try {
                            if (chartData.length < 2) {
                              return (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">
                                  Not enough data yet for this range.
                                </div>
                              );
                            }

                            // Calculate independent max values for each series for better visual separation
                            const maxScans = Math.max(...chartData.map(c => c.scans), 1);
                            const maxActions = Math.max(...chartData.map(c => c.actions), 1);
                            const maxScore = Math.max(...chartData.map(c => c.score), 1);

                            return (
                              <svg className="w-full h-full absolute inset-0 z-0 overflow-visible" preserveAspectRatio="none">
                                  <defs>
                                    {/* Gradient for Scans (green) - primary series */}
                                    <linearGradient id="chartScansGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.25" />
                                        <stop offset="50%" stopColor="#4ADE80" stopOpacity="0.1" />
                                        <stop offset="100%" stopColor="#4ADE80" stopOpacity="0" />
                                    </linearGradient>
                                    {/* Gradient for Actions (blue) - secondary series */}
                                    <linearGradient id="chartActionsGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                                        <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.08" />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                    </linearGradient>
                                    {/* Gradient for Score (orange) - tertiary series */}
                                    <linearGradient id="chartScoreGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.18" />
                                        <stop offset="50%" stopColor="#f97316" stopOpacity="0.06" />
                                        <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                                    </linearGradient>
                                  </defs>

                                  {/* Render Scans (green) with area fill - primary series */}
                                  {(() => {
                                    const coords = chartData.map((b, i) => {
                                      const x = (i / Math.max(chartData.length - 1, 1)) * 1000;
                                      const normalized = Math.max(0, b.scans) / maxScans;
                                      const y = 400 - normalized * 320; // Use more vertical space
                                      return { x, y };
                                    });

                                    if (coords.length < 2) return null;

                                    const linePath = buildPath(coords);
                                    if (!linePath) return null;
                                    const fillPath = `${linePath} L1000,400 L0,400 Z`;

                                    return (
                                      <React.Fragment key="scans">
                                        <MotionPath
                                          d={fillPath}
                                          fill="url(#chartScansGradient)"
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          transition={{ duration: 1.2, ease: "easeInOut" }}
                                        />
                                        <MotionPath
                                          d={linePath}
                                          fill="none"
                                          stroke="#4ade80"
                                          strokeWidth="2.5"
                                          initial={{ pathLength: 0 }}
                                          animate={{ pathLength: 1 }}
                                          transition={{ duration: 1.2, ease: "easeInOut" }}
                                        />
                                      </React.Fragment>
                                    );
                                  })()}

                                  {/* Render Actions (blue) with area fill - secondary series */}
                                  {(() => {
                                    const coords = chartData.map((b, i) => {
                                      const x = (i / Math.max(chartData.length - 1, 1)) * 1000;
                                      const normalized = Math.max(0, b.actions) / maxActions;
                                      const y = 400 - normalized * 280; // Slightly less vertical space
                                      return { x, y };
                                    });

                                    if (coords.length < 2) return null;

                                    const linePath = buildPath(coords);
                                    if (!linePath) return null;
                                    const fillPath = `${linePath} L1000,400 L0,400 Z`;

                                    return (
                                      <React.Fragment key="actions">
                                        <MotionPath
                                          d={fillPath}
                                          fill="url(#chartActionsGradient)"
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          transition={{ duration: 1.3, ease: "easeInOut" }}
                                        />
                                        <MotionPath
                                          d={linePath}
                                          fill="none"
                                          stroke="#3b82f6"
                                          strokeWidth="2.5"
                                          initial={{ pathLength: 0 }}
                                          animate={{ pathLength: 1 }}
                                          transition={{ duration: 1.3, ease: "easeInOut" }}
                                        />
                                      </React.Fragment>
                                    );
                                  })()}

                                  {/* Render Score (orange) with area fill - tertiary series */}
                                  {(() => {
                                    const coords = chartData.map((b, i) => {
                                      const x = (i / Math.max(chartData.length - 1, 1)) * 1000;
                                      const normalized = Math.max(0, b.score) / maxScore;
                                      const y = 400 - normalized * 240; // Even less vertical space
                                      return { x, y };
                                    });

                                    if (coords.length < 2) return null;

                                    const linePath = buildPath(coords);
                                    if (!linePath) return null;
                                    const fillPath = `${linePath} L1000,400 L0,400 Z`;

                                    return (
                                      <React.Fragment key="score">
                                        <MotionPath
                                          d={fillPath}
                                          fill="url(#chartScoreGradient)"
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          transition={{ duration: 1.4, ease: "easeInOut" }}
                                        />
                                        <MotionPath
                                          d={linePath}
                                          fill="none"
                                          stroke="#f97316"
                                          strokeWidth="2.5"
                                          initial={{ pathLength: 0 }}
                                          animate={{ pathLength: 1 }}
                                          transition={{ duration: 1.4, ease: "easeInOut" }}
                                        />
                                      </React.Fragment>
                                    );
                                  })()}

                                  {/* Interactive data point markers - highlight across all three series */}
                                  {chartData.map((dataPoint, i) => {
                                    const x = (i / Math.max(chartData.length - 1, 1)) * 1000;
                                    const isSelected = selectedDataPoint?.index === i;

                                    // Calculate Y positions for all three series
                                    const scansNormalized = Math.max(0, dataPoint.scans) / maxScans;
                                    const yScans = 400 - scansNormalized * 320;

                                    const actionsNormalized = Math.max(0, dataPoint.actions) / maxActions;
                                    const yActions = 400 - actionsNormalized * 280;

                                    const scoreNormalized = Math.max(0, dataPoint.score) / maxScore;
                                    const yScore = 400 - scoreNormalized * 240;

                                    return (
                                      <g key={`point-${i}`}>
                                        {/* Invisible larger hit area for easier clicking */}
                                        <rect
                                          x={x - 20}
                                          y={0}
                                          width="40"
                                          height="400"
                                          fill="transparent"
                                          className="cursor-pointer"
                                          onClick={() => setSelectedDataPoint({
                                            index: i,
                                            label: dataPoint.label,
                                            scans: dataPoint.scans,
                                            actions: dataPoint.actions,
                                            score: dataPoint.score,
                                          })}
                                        />
                                        {/* Visible markers on all three lines when selected */}
                                        {isSelected && (
                                          <>
                                            {/* Vertical guide line */}
                                            <line
                                              x1={x}
                                              y1={0}
                                              x2={x}
                                              y2={400}
                                              stroke="#4433FF"
                                              strokeWidth="1.5"
                                              strokeDasharray="4 4"
                                              opacity="0.4"
                                              style={{ pointerEvents: 'none' }}
                                            />
                                            {/* Marker on Scans line (green) */}
                                            <circle
                                              cx={x}
                                              cy={yScans}
                                              r="5"
                                              fill="#ffffff"
                                              stroke="#4ade80"
                                              strokeWidth="2.5"
                                              className="animate-pulse"
                                              style={{ pointerEvents: 'none' }}
                                            />
                                            {/* Marker on Actions line (blue) */}
                                            <circle
                                              cx={x}
                                              cy={yActions}
                                              r="5"
                                              fill="#ffffff"
                                              stroke="#3b82f6"
                                              strokeWidth="2.5"
                                              className="animate-pulse"
                                              style={{ pointerEvents: 'none' }}
                                            />
                                            {/* Marker on Score line (orange) */}
                                            <circle
                                              cx={x}
                                              cy={yScore}
                                              r="5"
                                              fill="#ffffff"
                                              stroke="#f97316"
                                              strokeWidth="2.5"
                                              className="animate-pulse"
                                              style={{ pointerEvents: 'none' }}
                                            />
                                          </>
                                        )}
                                      </g>
                                    );
                                  })}
                              </svg>
                            );
                          } catch (err) {
                            console.error('Chart render error', err);
                            return (
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">
                                Chart unavailable (error logged).
                              </div>
                            );
                          }
                        })()}
                    </div>
                    
                    <div className="flex justify-between text-[9px] text-gray-600 font-mono mt-2 uppercase">
                        {chartData.map((b, idx) => (
                          <span key={idx}>{b.label}</span>
                        ))}
                    </div>

                    {/* Data point detail panel */}
                    <AnimatePresence>
                        {selectedDataPoint && (
                            <MotionDiv
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden"
                            >
                                <div className="bg-[#000000] border border-[#1c1c1c] rounded-lg p-4 relative">
                                    <button
                                        onClick={() => setSelectedDataPoint(null)}
                                        className="absolute top-2 right-2 text-gray-500 hover:text-white transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                                        Data Point Detail — {selectedDataPoint.label}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rotate-45 bg-blue-500" />
                                                <span className="text-[9px] text-gray-500 uppercase tracking-wider">Scans</span>
                                            </div>
                                            <div className="text-2xl font-display font-bold text-blue-400">
                                                {selectedDataPoint.scans}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rotate-45 bg-purple-500" />
                                                <span className="text-[9px] text-gray-500 uppercase tracking-wider">Actions</span>
                                            </div>
                                            <div className="text-2xl font-display font-bold text-purple-400">
                                                {selectedDataPoint.actions}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rotate-45 bg-orange-500" />
                                                <span className="text-[9px] text-gray-500 uppercase tracking-wider">Score</span>
                                            </div>
                                            <div className="text-2xl font-display font-bold text-orange-400">
                                                {selectedDataPoint.score}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </MotionDiv>
                        )}
                    </AnimatePresence>
                </div>
            </SparkBorder>

            {/* CASES / WORKLOAD SECTION */}
            <SparkBorder>
                <div className="bg-[#000000] border border-[#1c1c1c] rounded-xl p-6 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 text-orange-500">
                            <Briefcase size={16} />
                            <h3 className="text-xs font-bold uppercase tracking-widest">Cases / Workload</h3>
                        </div>
                    </div>
                    <CasesView />
                </div>
            </SparkBorder>

            {/* BOTTOM ROW - Two columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SparkBorder>
                    <RebelsRankingWidget />
                </SparkBorder>

                <SparkBorder>
                    <FrameIntegrityWidget />
                </SparkBorder>
            </div>
        </div>
    );
}

// Frame Score Tile Widget for Dashboard Overview
const FrameScoreTileWidget: React.FC = () => {
    const reports = getContactZeroReports();
    const profile = computeCumulativeFrameProfileForContact(CONTACT_ZERO.id, reports);
    const trend = computeFrameProfileTrend(reports);

    const scoreColorClass = getFrameScoreColorClass(profile.currentFrameScore);
    const scoreLabel = getFrameScoreLabel(profile.currentFrameScore);

    return (
        <div className="bg-[#000000] border border-[#1c1c1c] rounded-xl p-6 relative overflow-hidden h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-[#4433FF]">
                    <Crosshair size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-widest">Frame Score</h3>
                </div>
                {profile.scansCount > 0 && (
                    <div className="text-[9px] bg-[#4433FF]/20 text-[#4433FF] px-2 py-0.5 rounded font-bold border border-[#4433FF]/30">
                        {profile.scansCount} SCAN{profile.scansCount !== 1 ? 'S' : ''}
                    </div>
                )}
            </div>

            <div className="flex-1 flex items-center justify-between">
                <div>
                    <div className={`text-4xl font-display font-bold ${scoreColorClass}`}>
                        {profile.currentFrameScore}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        {trend && (
                            <span className={`flex items-center gap-0.5 text-xs ${
                                trend.direction === 'up' ? 'text-blue-400' :
                                trend.direction === 'down' ? 'text-red-400' : 'text-gray-500'
                            }`}>
                                {trend.direction === 'up' ? <TrendingUp size={12} /> :
                                 trend.direction === 'down' ? <TrendingDown size={12} /> :
                                 null}
                                {trend.changeAmount > 0 && `${trend.changeAmount}`}
                            </span>
                        )}
                        <span className="text-xs text-gray-500">{scoreLabel}</span>
                    </div>
                </div>

                {/* Mini circular progress */}
                <div className="w-16 h-16 relative">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle
                            className="stroke-[#222]"
                            fill="none"
                            strokeWidth="3"
                            cx="18"
                            cy="18"
                            r="15"
                        />
                        <circle
                            className={`${
                                profile.currentFrameScore >= 65 ? 'stroke-blue-500' :
                                profile.currentFrameScore >= 45 ? 'stroke-yellow-500' :
                                'stroke-red-500'
                            }`}
                            fill="none"
                            strokeWidth="3"
                            strokeLinecap="round"
                            cx="18"
                            cy="18"
                            r="15"
                            strokeDasharray={`${profile.currentFrameScore * 0.94} 100`}
                        />
                    </svg>
                </div>
            </div>

            {profile.lastScanAt && (
                <div className="text-[9px] text-gray-600 mt-2">
                    Last: {formatProfileDate(profile.lastScanAt)}
                </div>
            )}
        </div>
    );
};


type ViewMode = 'OVERVIEW' | 'DOSSIER' | 'NOTES' | 'SCAN' | 'CONTACTS' | 'CASES' | 'PIPELINES' | 'PROJECTS' | 'TOPIC' | 'TASKS' | 'CALENDAR' | 'ACTIVITY' | 'SETTINGS' | 'FRAMESCAN' | 'FRAMESCAN_REPORT' | 'PUBLIC_SCAN' | 'FRAME_DEMO' | 'DAILY_LOG' | 'INBOX' | 'FOLDER' | 'NOTE_DETAIL' | 'BLOCKSUITE_TEST' | 'WANTS';

export const Dashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('OVERVIEW');
  const [time, setTime] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);

  // ==========================================================================
  // CENTRALIZED SELECTED CONTACT STATE
  // ==========================================================================
  const [selectedContactId, setSelectedContactId] = useState<string>(CONTACT_ZERO.id);

  // ==========================================================================
  // SELECTED TOPIC STATE (for Topic view)
  // ==========================================================================
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  // ==========================================================================
  // SELECTED PROJECT STATE (for Project detail view)
  // ==========================================================================
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // ==========================================================================
  // SELECTED FOLDER STATE (for PARA folder views)
  // ==========================================================================
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // ==========================================================================
  // SELECTED NOTE STATE (for Note detail view)
  // ==========================================================================
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // ==========================================================================
  // SELECTED FRAMESCAN REPORT STATE (for FrameScan report detail view)
  // ==========================================================================
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // ==========================================================================
  // SELECTED WANT STATE (for Want detail view)
  // ==========================================================================
  const [selectedWantId, setSelectedWantId] = useState<string | null>(null);

  // Get selected contact for display in header
  const selectedContact = getContactById(selectedContactId) || getContactZero();

  // Get selected topic for display in header
  const selectedTopic = selectedTopicId ? getTopicById(selectedTopicId) : null;

  // ==========================================================================
  // SAVAGE MODE TOGGLE
  // ==========================================================================
  const { isEnabled: isSavageModeEnabled, toggle: toggleSavageMode } = useSavageMode();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // BlockSuite test: Check for ?bstest param or Ctrl+Shift+B shortcut
  useEffect(() => {
    // Check URL param on mount
    if (window.location.search.includes('bstest')) {
      setCurrentView('BLOCKSUITE_TEST');
    }

    // Add keyboard shortcut: Ctrl+Shift+B to toggle test view
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        setCurrentView(prev => prev === 'BLOCKSUITE_TEST' ? 'OVERVIEW' : 'BLOCKSUITE_TEST');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Only show the right sidebar on Overview
  useEffect(() => {
    setIsRightSidebarOpen(currentView === 'OVERVIEW');
    // Default left sidebar: open on overview, allow closed elsewhere
    setIsLeftSidebarOpen(currentView === 'OVERVIEW');
  }, [currentView]);

  const handleNav = (view: ViewMode) => {
      setCurrentView(view);
      setIsMobileMenuOpen(false);
  };

  // Handler for Contact Zero nav item — sets contact and navigates to dossier
  const handleContactZeroNav = () => {
      setSelectedContactId(CONTACT_ZERO.id);
      setCurrentView('DOSSIER');
      setIsMobileMenuOpen(false);
  };

  // Handler for navigating to a topic
  const handleNavigateToTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    setCurrentView('TOPIC');
  };

  const handleNavigateToGroup = () => {
    // Groups live inside Projects now; jump to Projects workspace
    setCurrentView('PROJECTS');
  };

  const handleNavigateToProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentView('PROJECTS');
  };

  const handleNavigateToFrameScanReport = (reportId: string) => {
    setSelectedReportId(reportId);
    setCurrentView('FRAMESCAN_REPORT');
  };

  // Handler for navigating to a Want
  const handleNavigateToWant = (wantId: string | null) => {
    setSelectedWantId(wantId);
    setCurrentView('WANTS');
  };

  // Get header title based on view
  const getHeaderTitle = (): string => {
    if (currentView === 'DOSSIER') {
      return selectedContact.fullName.toUpperCase();
    }
    if (currentView === 'TOPIC' && selectedTopic) {
      return `#${selectedTopic.label.toUpperCase()}`;
    }
    if (currentView === 'FRAMESCAN' || currentView === 'FRAMESCAN_REPORT') {
      return 'FRAME SCANS';
    }
    if (currentView === 'PUBLIC_SCAN') {
      return 'TRY FRAMESCAN';
    }
    if (currentView === 'FRAME_DEMO') {
      return 'FRAME REPORT DEMO';
    }
    return currentView;
  };

  // Navigate to Frame Scan report detail
  const handleViewReport = (reportId: string) => {
    setSelectedReportId(reportId);
    setCurrentView('FRAMESCAN_REPORT');
  };

  // Navigate back from Frame Scan report to list
  const handleBackToFrameScans = () => {
    setSelectedReportId(null);
    setCurrentView('FRAMESCAN');
  };

  // Navigate to Frame Scans list from anywhere
  const handleOpenFrameScans = () => {
    setCurrentView('FRAMESCAN');
  };

  return (
    <LittleLordProvider
      tenantId="default_tenant"
      userId={CONTACT_ZERO.id}
      showFloatingButton={true}
      currentViewId={mapViewToLittleLordViewId(currentView)}
      selectedContactId={selectedContactId}
    >
      <div className="fixed inset-0 text-[#DBDBDB] font-sans flex flex-col lg:flex-row overflow-hidden z-[50] app-neon">
        <aside className={`
          ${isLeftSidebarOpen ? 'w-[280px]' : 'w-0'} flex-shrink-0 flex flex-col z-40 transform transition-all duration-300 lg:relative overflow-hidden app-sidebar-framelord
          ${isMobileMenuOpen && isLeftSidebarOpen ? 'translate-x-0' : isLeftSidebarOpen ? 'translate-x-0' : 'lg:translate-x-0 -translate-x-full'}
      `}>
        {/* BLACK TOP BAR - Seamless zone: Logo + Overview (no grid, no particles, no dividers) */}
        <div className="sidebar-header-zone hidden lg:flex flex-col px-3 pt-4 pb-2">
            {/* Logo row */}
            <div className="flex items-center px-3 mb-4">
                <span className="px-2 py-1 rounded-md border border-[#1f2f45] bg-[#0e1a2d]/80 text-[#0043FF] shadow-[0_0_14px_rgba(0,67,255,0.35)] mr-3 text-sm font-bold">[ ]</span>
                <div className="leading-tight">
                    <h1 className="font-display font-bold text-white text-sm tracking-wider">FRAMELORD</h1>
                    <p className="text-[9px] text-gray-500 tracking-wide">THE OS FOR DOMINANCE</p>
                </div>
            </div>
            {/* Overview - part of black bar */}
            <NavItem active={currentView === 'OVERVIEW'} onClick={() => handleNav('OVERVIEW')} icon={<LayoutGrid size={16} />} label="OVERVIEW" />
        </div>

        {/* BLUE CONTENT ZONE - Grid + Particles region */}
        <div className="sidebar-content-zone flex-1 overflow-hidden">
          {/* Particle layer - only in blue zone */}
          <SidebarParticles />
          <div className="py-4 px-3 space-y-1 overflow-y-auto h-full">
            <div className="px-3 mb-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-sm" /> Tools
            </div>
            <NavItem 
              active={currentView === 'DOSSIER' && selectedContactId === CONTACT_ZERO.id} 
              onClick={handleContactZeroNav} 
              icon={<Crosshair size={16} />} 
              label="CONTACT ZERO" 
            />
            <NavItem active={currentView === 'NOTES'} onClick={() => handleNav('NOTES')} icon={<Notebook size={16} />} label="NOTES" />
            <NavItem active={currentView === 'SCAN'} onClick={() => handleNav('SCAN')} icon={<Scan size={16} />} label="SCAN" />
            <NavItem active={currentView === 'FRAMESCAN' || currentView === 'FRAMESCAN_REPORT'} onClick={() => handleNav('FRAMESCAN')} icon={<Crosshair size={16} />} label="FRAME SCANS" />
            <NavItem active={currentView === 'WANTS'} onClick={() => handleNav('WANTS')} icon={<Target size={16} />} label="WANTS" />
            <NavItem active={currentView === 'CONTACTS'} onClick={() => handleNav('CONTACTS')} icon={<Users size={16} />} label="CONTACTS" />
          </div>
        </div>

        {/* FOOTER ZONE - Account section */}
        <div className="sidebar-footer-zone p-4 space-y-2">
          {/* Contact Zero Info - Always shows account owner */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded flex items-center justify-center overflow-hidden bg-[#4433FF]">
              <img src={CONTACT_ZERO.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${CONTACT_ZERO.id}`} alt="User" className="w-full h-full object-cover" />
            </div>
            <div className="overflow-hidden flex-1">
              <h4 className="font-display font-bold text-white text-sm">{CONTACT_ZERO.fullName.toUpperCase()}</h4>
              <p className="text-[9px] text-gray-500 truncate uppercase">{CONTACT_ZERO.relationshipRole}</p>
            </div>
            {selectedContactId !== CONTACT_ZERO.id && (
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-[8px] text-orange-500 font-bold uppercase">Viewing</span>
              </div>
            )}
          </div>
          {/* Settings Button - Always available */}
          <button
            onClick={() => setCurrentView('SETTINGS')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
              currentView === 'SETTINGS'
                ? 'bg-[#4433FF]/20 text-[#4433FF]'
                : 'text-gray-500 hover:text-white hover:bg-[#111111]'
            }`}
          >
            <Settings size={14} />
            <span className="font-bold uppercase tracking-widest">Settings</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative transition-all duration-300">
         <div className="hidden lg:flex h-16 border-b border-[#1c1c1c] items-center justify-between px-8 shrink-0 glass-card">
             <div className="flex items-center gap-2">
                 <button
                   onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
                   className="p-2 rounded hover:bg-[#111111] text-gray-500 hover:text-white transition-colors"
                   title="Toggle navigation"
                 >
                   {isLeftSidebarOpen ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                 </button>
                 <span className="bg-[#4433FF] text-white text-xs px-1.5 py-0.5 rounded-sm font-bold">[ ]</span>
                 <h2 className="font-display font-bold text-2xl text-white tracking-tight">{getHeaderTitle()}</h2>
                 {currentView === 'DOSSIER' && selectedContactId === CONTACT_ZERO.id && (
                   <span className="text-[10px] bg-[#4433FF]/20 text-[#4433FF] px-2 py-0.5 rounded border border-[#4433FF]/30 font-bold uppercase ml-2">
                     You
                   </span>
                 )}
                 {currentView === 'TOPIC' && selectedTopic && (
                   <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30 font-bold uppercase ml-2">
                     Topic
                   </span>
                 )}
             </div>
             <div className="flex items-center gap-6">
                 {currentView === 'OVERVIEW' && (
                   <button
                      onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                      className="p-1.5 hover:bg-[#111111] rounded text-gray-500 hover:text-white transition-colors"
                      title="Toggle Sidebar"
                   >
                       {isRightSidebarOpen ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                   </button>
                 )}
             </div>
         </div>

         <div className={`p-4 md:p-6 flex-1 overflow-y-auto custom-scrollbar ${!isLeftSidebarOpen ? 'max-w-full' : ''}`}>
             {currentView === 'OVERVIEW' && <DashboardOverview />}
            {currentView === 'DOSSIER' && (
              <ContactDossierView
                selectedContactId={selectedContactId}
                setSelectedContactId={setSelectedContactId}
                onNavigateToDossier={() => setCurrentView('DOSSIER')}
                onNavigateToTopic={handleNavigateToTopic}
                onNavigateToGroup={handleNavigateToGroup}
                onNavigateToProject={handleNavigateToProject}
                onNavigateToFrameScanReport={handleNavigateToFrameScanReport}
              />
            )}
             {currentView === 'TOPIC' && selectedTopicId && (
               <TopicView
                 topicId={selectedTopicId}
                 selectedContactId={selectedContactId}
                 setSelectedContactId={setSelectedContactId}
                 onNavigateToDossier={() => setCurrentView('DOSSIER')}
                 onNavigateToGroup={handleNavigateToGroup}
                 onBack={() => setCurrentView('DOSSIER')}
               />
             )}
             {currentView === 'SCAN' && <ScanView />}
            {/* AFFiNE-style Notes - single unified view */}
            {currentView === 'NOTES' && (
              <AffineNotes
                onNavigateToContact={(contactId) => {
                  setSelectedContactId(contactId);
                  setCurrentView('DOSSIER');
                }}
              />
            )}
            {currentView === 'WANTS' && (
              <WantsPage
                initialWantId={selectedWantId || undefined}
              />
            )}
            {currentView === 'CONTACTS' && (
               <ContactsView 
                 selectedContactId={selectedContactId}
                 setSelectedContactId={setSelectedContactId}
                 onViewDossier={() => setCurrentView('DOSSIER')}
               />
             )}
             {currentView === 'TASKS' && (
               <TasksView
                 selectedContactId={selectedContactId}
                 setSelectedContactId={setSelectedContactId}
                 onNavigateToDossier={() => setCurrentView('DOSSIER')}
                 onNavigateToNotes={() => setCurrentView('NOTES')}
               />
             )}
             {currentView === 'CALENDAR' && (
               <CalendarView
                 selectedContactId={selectedContactId}
                 setSelectedContactId={setSelectedContactId}
                 onNavigateToDossier={() => setCurrentView('DOSSIER')}
               />
             )}
             {currentView === 'ACTIVITY' && (
               <ActivityView
                 selectedContactId={selectedContactId}
                 setSelectedContactId={setSelectedContactId}
                 onNavigateToDossier={() => setCurrentView('DOSSIER')}
               />
             )}
             {currentView === 'PIPELINES' && (
               <PipelinesView
                 selectedContactId={selectedContactId}
                 setSelectedContactId={setSelectedContactId}
                 onNavigateToDossier={() => setCurrentView('DOSSIER')}
               />
             )}
             {currentView === 'PROJECTS' && !selectedProjectId && (
               <ProjectsView
                 selectedContactId={selectedContactId}
                 setSelectedContactId={setSelectedContactId}
                 onNavigateToDossier={() => setCurrentView('DOSSIER')}
                 onNavigateToProject={handleNavigateToProject}
               />
             )}
             {currentView === 'PROJECTS' && selectedProjectId && (
               <ProjectDetailView
                 projectId={selectedProjectId}
                 onBack={() => setSelectedProjectId(null)}
                 selectedContactId={selectedContactId}
                 setSelectedContactId={setSelectedContactId}
                 onNavigateToDossier={() => setCurrentView('DOSSIER')}
               />
             )}
             {currentView === 'SETTINGS' && (
               <SettingsView
                 selectedContactId={selectedContactId}
                 setSelectedContactId={setSelectedContactId}
               />
             )}
             {currentView === 'FRAMESCAN' && (
               <FrameScanPage
                 onViewReport={handleViewReport}
                 onNavigateToContact={(contactId) => {
                   setSelectedContactId(contactId);
                   setCurrentView('DOSSIER');
                 }}
               />
             )}
             {currentView === 'FRAMESCAN_REPORT' && selectedReportId && (() => {
               const report = getReportById(selectedReportId);
               if (!report) {
                 return (
                   <div style={{ padding: 24, color: '#fff' }}>
                     <button onClick={handleBackToFrameScans} style={{ marginBottom: 16 }}>← Back</button>
                     <p>Report not found</p>
                   </div>
                 );
               }
               return (
                 <div>
                   <button
                     onClick={handleBackToFrameScans}
                     className="framescan-back-button"
                   >
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                       <path d="M19 12H5M12 19l-7-7 7-7" />
                     </svg>
                     Back to Reports
                   </button>
                   <FrameScanReportLayout
                    report={report}
                    onNavigateToNote={(noteId) => {
                      setSelectedNoteId(noteId);
                      setCurrentView('NOTES');
                    }}
                  />
                 </div>
               );
             })()}
             {currentView === 'PUBLIC_SCAN' && (
               <PublicFrameScanPage />
             )}
             {currentView === 'FRAME_DEMO' && appConfig.enableDevRoutes && (
               <FrameReportDemoPage />
             )}
         </div>
      </main>

      <AnimatePresence mode="popLayout">
      {isRightSidebarOpen && (
          <MotionAside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden xl:flex glass-card border-l border-[#1c1c1c] flex-col shrink-0 z-40 overflow-hidden relative"
          >
              <div className="h-[400px] shrink-0 border-b border-[#1c1c1c]">
                <ClockWidget time={time} />
              </div>
              <ThingsDueWidget />
              <NotificationWidget />
          </MotionAside>
      )}
      </AnimatePresence>
      </div>
    </LittleLordProvider>
  );
};

const NavItem: React.FC<{ active?: boolean, icon: React.ReactNode, label: string, isSubItem?: boolean, onClick?: () => void, hasLock?: boolean }> = ({ active, icon, label, isSubItem, onClick, hasLock }) => (
    <div 
        onClick={onClick}
        className={`
            flex items-center justify-between px-3 py-2 cursor-pointer transition-all duration-200 rounded group
            ${active ? 'text-white bg-[#111111]' : 'text-gray-500 hover:text-gray-300 hover:bg-[#111111]'}
            ${isSubItem ? 'pl-8 text-xs' : 'text-xs'}
        `}
    >
        <div className="flex items-center gap-3">
            <span className={`${active ? 'text-[#4433FF]' : 'group-hover:text-white'}`}>{icon}</span>
            <span className="font-bold tracking-wider">{label}</span>
        </div>
        {active && <div className="w-1.5 h-1.5 bg-[#4433FF] rounded-full" />}
        {hasLock && <Lock size={12} className="text-gray-700" />}
    </div>
);
