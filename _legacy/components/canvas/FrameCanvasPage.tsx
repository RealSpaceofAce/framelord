// =============================================================================
// FRAME CANVAS PAGE — FrameLord shell for Excalidraw
// =============================================================================
// Provides the FrameLord-styled header, navigation, and scan functionality
// while letting Excalidraw handle the actual whiteboard experience.
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Check,
  X,
  LayoutGrid,
  Pencil,
  ChevronLeft,
  Calendar,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  getThreads,
  createThread,
  updateThreadTitle,
  deleteThread,
  getThreadCount,
  type CanvasThread,
} from '../../stores/canvasStore';
import { BlockSuiteEdgelessCanvas } from './BlockSuiteEdgelessCanvas';

const MotionDiv = motion.div as any;

type ViewMode = 'list' | 'canvas';

export const FrameCanvasPage: React.FC = () => {
  const [threads, setThreads] = useState<CanvasThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Load threads on mount
  useEffect(() => {
    const loadedThreads = getThreads();
    setThreads(loadedThreads);
  }, []);

  // Focus title input when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const activeThread = threads.find(t => t.id === activeThreadId) ?? null;

  const handleCreateThread = useCallback(() => {
    const count = getThreadCount();
    const newThread = createThread(`Canvas ${count + 1}`);
    setThreads(getThreads());
    setActiveThreadId(newThread.id);
    setViewMode('canvas');
  }, []);

  const handleOpenThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
    setViewMode('canvas');
  }, []);

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setActiveThreadId(null);
    setThreads(getThreads());
  }, []);

  const handleStartEditTitle = useCallback(() => {
    if (activeThread) {
      setEditedTitle(activeThread.title);
      setIsEditingTitle(true);
    }
  }, [activeThread]);

  const handleSaveTitle = useCallback(() => {
    if (activeThread && editedTitle.trim()) {
      updateThreadTitle(activeThread.id, editedTitle.trim());
      setThreads(getThreads());
    }
    setIsEditingTitle(false);
  }, [activeThread, editedTitle]);

  const handleCancelEditTitle = useCallback(() => {
    setIsEditingTitle(false);
    setEditedTitle('');
  }, []);

  const handleDeleteThread = useCallback((threadId: string) => {
    deleteThread(threadId);
    const remaining = getThreads();
    setThreads(remaining);
    if (activeThreadId === threadId) {
      setActiveThreadId(null);
      setViewMode('list');
    }
    setShowDeleteConfirm(null);
  }, [activeThreadId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEditTitle();
    }
  }, [handleSaveTitle, handleCancelEditTitle]);

  const handleCanvasChange = useCallback(() => {
    setThreads(getThreads());
  }, []);

  const handleScanCanvas = useCallback(async () => {
    if (!activeThread || isScanning) return;

    setIsScanning(true);
    setScanComplete(false);

    // BACKEND TODO: POST /api/canvas/scan with thread data
    console.log('[FrameCanvas] Scanning canvas:', activeThread.id);

    await new Promise(resolve => setTimeout(resolve, 4000));

    setIsScanning(false);
    setScanComplete(true);

    setTimeout(() => setScanComplete(false), 5000);
  }, [activeThread, isScanning]);

  const toggleFullscreen = useCallback(async () => {
    if (!canvasContainerRef.current) return;

    try {
      if (!isFullscreen) {
        // Enter fullscreen
        if (canvasContainerRef.current.requestFullscreen) {
          await canvasContainerRef.current.requestFullscreen();
        } else if ((canvasContainerRef.current as any).webkitRequestFullscreen) {
          await (canvasContainerRef.current as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0A0A0F] relative">
      {/* Scanning Animation Overlay */}
      <AnimatePresence>
        {isScanning && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] pointer-events-none"
          >
            <MotionDiv
              initial={{ top: 0 }}
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute left-0 right-0 h-1"
              style={{
                background: 'linear-gradient(90deg, transparent, #4f46e5, #818cf8, #4f46e5, transparent)',
                boxShadow: '0 0 20px 10px rgba(79, 70, 229, 0.5), 0 0 60px 30px rgba(79, 70, 229, 0.3)',
              }}
            />
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.05, 0.15, 0.05] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 bg-indigo-500/10"
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
            className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 bg-[#1E2028] border border-indigo-500/30 rounded-xl shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
                <Sparkles size={20} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-medium">Canvas Scan Initiated</h3>
                <p className="text-sm text-gray-400">You'll receive a notification when your Frame Scan is ready.</p>
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          // Canvas List View
          <MotionDiv
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full min-h-0"
          >
            {/* Header */}
            <div className="flex-shrink-0 border-b border-[#1E2028] bg-[#12141A] px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <LayoutGrid size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-white">Frame Canvas</h1>
                    <p className="text-sm text-gray-500">{threads.length} canvas{threads.length !== 1 ? 'es' : ''}</p>
                  </div>
                </div>
                <button
                  onClick={handleCreateThread}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 transition-colors"
                >
                  <Plus size={16} />
                  New Canvas
                </button>
              </div>
            </div>

            {/* Canvas Grid */}
            <div className="flex-1 overflow-auto p-6">
              {threads.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <LayoutGrid size={48} className="text-gray-600 mx-auto mb-4" />
                    <h2 className="text-lg font-medium text-white mb-2">No Canvases Yet</h2>
                    <p className="text-sm text-gray-500 mb-4">Create a canvas to start sketching and planning</p>
                    <button
                      onClick={handleCreateThread}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 transition-colors mx-auto"
                    >
                      <Plus size={16} />
                      Create First Canvas
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {threads.map(thread => (
                    <div
                      key={thread.id}
                      className="group bg-[#1E2028] border border-[#2A2D35] rounded-xl overflow-hidden hover:border-indigo-500/50 transition-colors cursor-pointer"
                      onClick={() => handleOpenThread(thread.id)}
                    >
                      <div className="h-32 bg-[#191B20] relative overflow-hidden">
                        <div 
                          className="absolute inset-0"
                          style={{
                            backgroundImage: `radial-gradient(circle at 1px 1px, #2a2d35 1px, transparent 0)`,
                            backgroundSize: '12px 12px',
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Layers size={32} className="text-gray-700" />
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <h3 className="font-medium text-white truncate group-hover:text-indigo-400 transition-colors">
                          {thread.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <Calendar size={12} />
                          <span>{formatDate(thread.updatedAt)}</span>
                        </div>
                      </div>

                      <div className="px-4 pb-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(thread.id);
                          }}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div
                    className="bg-[#1E2028]/50 border border-dashed border-[#2A2D35] rounded-xl overflow-hidden hover:border-indigo-500/50 transition-colors cursor-pointer flex items-center justify-center min-h-[200px]"
                    onClick={handleCreateThread}
                  >
                    <div className="text-center p-4">
                      <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Plus size={24} className="text-indigo-400" />
                      </div>
                      <span className="text-sm text-gray-400">New Canvas</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </MotionDiv>
        ) : (
          // Canvas Editor View
          <MotionDiv
            key="canvas"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full min-h-0 overflow-hidden"
          >
            {/* Minimal Header */}
            <div className="flex-shrink-0 border-b border-[#1E2028] bg-[#12141A] px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBackToList}
                    className="p-2 text-gray-400 hover:text-white hover:bg-[#2A2D35] rounded-lg transition-colors"
                    title="Back to Canvases"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="h-6 w-px bg-[#2A2D35]" />

                  {activeThread && (
                    <>
                      {isEditingTitle ? (
                        <div className="flex items-center gap-1">
                          <input
                            ref={titleInputRef}
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="px-2 py-1 bg-[#1E2028] border border-indigo-500 rounded text-white text-sm focus:outline-none w-48"
                          />
                          <button onClick={handleSaveTitle} className="p-1 text-green-400 hover:bg-green-400/10 rounded">
                            <Check size={14} />
                          </button>
                          <button onClick={handleCancelEditTitle} className="p-1 text-red-400 hover:bg-red-400/10 rounded">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleStartEditTitle}
                          className="flex items-center gap-2 px-2 py-1 text-white text-sm font-medium hover:bg-[#1E2028] rounded transition-colors group"
                        >
                          {activeThread.title}
                          <Pencil size={12} className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 text-gray-400 hover:text-white hover:bg-[#2A2D35] rounded-lg transition-colors"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                  >
                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>

                  <button
                    onClick={handleScanCanvas}
                    disabled={isScanning}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/25"
                  >
                    <Sparkles size={16} className={isScanning ? 'animate-pulse' : ''} />
                    {isScanning ? 'Scanning...' : 'Scan Canvas'}
                  </button>
                </div>
              </div>
            </div>

            {/* Canvas Area */}
            <div ref={canvasContainerRef} className="flex-1 min-h-0 flex" style={{ minHeight: isFullscreen ? '100vh' : '600px' }}>
              {activeThread ? (
                <BlockSuiteEdgelessCanvas canvasId={activeThread.id} />
              ) : (
                <div className="flex items-center justify-center h-full w-full bg-[#12141A]">
                  <div className="text-center">
                    <LayoutGrid size={48} className="text-gray-600 mx-auto mb-4" />
                    <h2 className="text-lg font-medium text-white mb-2">Select a Canvas</h2>
                    <button onClick={handleBackToList} className="text-indigo-400 hover:text-indigo-300 text-sm">
                      Back to canvas list
                    </button>
                  </div>
                </div>
              )}
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <MotionDiv
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1E2028] border border-[#2A2D35] rounded-xl p-6 max-w-sm mx-4"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-white mb-2">Delete Canvas?</h3>
              <p className="text-sm text-gray-400 mb-4">
                This will permanently delete this canvas and all its content.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteThread(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FrameCanvasPage;
