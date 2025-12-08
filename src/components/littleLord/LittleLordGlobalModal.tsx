// =============================================================================
// LITTLE LORD FLOATING WINDOW — Draggable, resizable AI coach
// =============================================================================
// Floating window that can be dragged anywhere, resized, and minimized.
// Lives on top of all content so users can chat while working.
// =============================================================================

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Minus, Maximize2, Minimize2, GripVertical } from 'lucide-react';
import { LittleLordChat } from './LittleLordChat';
import type { LittleLordContext } from '../../services/littleLord/types';
import { getLittleLordDisplayName } from '../../services/littleLord';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

export interface LittleLordGlobalModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  userId: string;
  context?: LittleLordContext;
}

interface WindowPosition {
  x: number;
  y: number;
}

interface WindowSize {
  width: number;
  height: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const LittleLordGlobalModal: React.FC<LittleLordGlobalModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  userId,
  context,
}) => {
  // Window state
  const [position, setPosition] = useState<WindowPosition>({ x: 100, y: 100 });
  const [size, setSize] = useState<WindowSize>({ width: 420, height: 500 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  
  // Refs
  const windowRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; posX: number; posY: number }>({ x: 0, y: 0, posX: 0, posY: 0 });
  const resizeStart = useRef<{ x: number; y: number; width: number; height: number; posX: number; posY: number }>({ 
    x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 
  });
  const prevSize = useRef<WindowSize>({ width: 420, height: 500 });
  const prevPosition = useRef<WindowPosition>({ x: 100, y: 100 });

  // Initialize position on first open
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      // Position in bottom-right by default
      const newX = window.innerWidth - size.width - 20;
      const newY = window.innerHeight - size.height - 100;
      setPosition({ x: Math.max(20, newX), y: Math.max(20, newY) });
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Dragging handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [position, isMaximized]);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const newX = Math.max(0, Math.min(window.innerWidth - 100, dragStart.current.posX + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - 50, dragStart.current.posY + dy));
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Resizing handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y,
    };
  }, [size, position, isMaximized]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeDirection) return;
    
    const dx = e.clientX - resizeStart.current.x;
    const dy = e.clientY - resizeStart.current.y;
    
    let newWidth = resizeStart.current.width;
    let newHeight = resizeStart.current.height;
    let newX = resizeStart.current.posX;
    let newY = resizeStart.current.posY;
    
    // Handle different resize directions
    if (resizeDirection.includes('e')) {
      newWidth = Math.max(300, resizeStart.current.width + dx);
    }
    if (resizeDirection.includes('w')) {
      const widthChange = Math.min(dx, resizeStart.current.width - 300);
      newWidth = resizeStart.current.width - widthChange;
      newX = resizeStart.current.posX + widthChange;
    }
    if (resizeDirection.includes('s')) {
      newHeight = Math.max(200, resizeStart.current.height + dy);
    }
    if (resizeDirection.includes('n')) {
      const heightChange = Math.min(dy, resizeStart.current.height - 200);
      newHeight = resizeStart.current.height - heightChange;
      newY = resizeStart.current.posY + heightChange;
    }
    
    setSize({ width: newWidth, height: newHeight });
    setPosition({ x: newX, y: newY });
  }, [isResizing, resizeDirection]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeDirection(null);
  }, []);

  // Global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Minimize/Maximize handlers
  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
    setIsMaximized(false);
  }, []);

  const handleMaximize = useCallback(() => {
    if (isMaximized) {
      // Restore previous size and position
      setSize(prevSize.current);
      setPosition(prevPosition.current);
      setIsMaximized(false);
    } else {
      // Save current size and position
      prevSize.current = size;
      prevPosition.current = position;
      // Maximize
      setPosition({ x: 20, y: 20 });
      setSize({ 
        width: window.innerWidth - 40, 
        height: window.innerHeight - 40 
      });
      setIsMaximized(true);
    }
  }, [isMaximized, size, position]);

  const handleRestore = useCallback(() => {
    setIsMinimized(false);
  }, []);

  const displayName = getLittleLordDisplayName();

  // Resize handle component
  const ResizeHandle: React.FC<{ direction: string; className: string; cursor: string }> = ({ direction, className, cursor }) => (
    <div
      className={`absolute ${className} opacity-0 hover:opacity-100 transition-opacity z-10`}
      style={{ cursor }}
      onMouseDown={(e) => handleResizeStart(e, direction)}
    >
      <div className="w-full h-full bg-indigo-500/30" />
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Minimized state - small bar at bottom */}
          {isMinimized ? (
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-4 right-4 z-[100] bg-[#1E2028] border border-[#4433FF]/30 rounded-lg shadow-2xl cursor-pointer overflow-hidden"
              onClick={handleRestore}
            >
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#252830] transition-colors">
                <div className="p-1.5 bg-[#4433FF]/20 rounded-lg">
                  <Crown size={16} className="text-[#4433FF]" />
                </div>
                <span className="text-sm font-medium text-white">{displayName}</span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
            </MotionDiv>
          ) : (
            // Full floating window
            <MotionDiv
              ref={windowRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[100] bg-[#0E0E0E] border border-[#333] rounded-xl shadow-2xl overflow-hidden"
              style={{
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                cursor: isDragging ? 'grabbing' : 'default',
              }}
            >
              {/* Resize handles */}
              {!isMaximized && (
                <>
                  <ResizeHandle direction="n" className="top-0 left-2 right-2 h-1" cursor="n-resize" />
                  <ResizeHandle direction="s" className="bottom-0 left-2 right-2 h-1" cursor="s-resize" />
                  <ResizeHandle direction="e" className="top-2 bottom-2 right-0 w-1" cursor="e-resize" />
                  <ResizeHandle direction="w" className="top-2 bottom-2 left-0 w-1" cursor="w-resize" />
                  <ResizeHandle direction="ne" className="top-0 right-0 w-3 h-3" cursor="ne-resize" />
                  <ResizeHandle direction="nw" className="top-0 left-0 w-3 h-3" cursor="nw-resize" />
                  <ResizeHandle direction="se" className="bottom-0 right-0 w-3 h-3" cursor="se-resize" />
                  <ResizeHandle direction="sw" className="bottom-0 left-0 w-3 h-3" cursor="sw-resize" />
                </>
              )}

              {/* Header - Draggable */}
              <div
                className="px-4 py-3 border-b border-[#222] bg-gradient-to-r from-[#4433FF]/10 to-transparent cursor-grab active:cursor-grabbing select-none"
                onMouseDown={handleDragStart}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[#4433FF]/20 rounded-lg border border-[#4433FF]/30">
                      <Crown size={16} className="text-[#4433FF]" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">{displayName}</h2>
                      <p className="text-[10px] text-gray-400">Your Apex Frame coach</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Drag indicator */}
                    <div className="px-2 text-gray-500">
                      <GripVertical size={14} />
                    </div>
                    
                    {/* Minimize */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMinimize(); }}
                      className="p-1.5 hover:bg-[#1A1A1A] rounded-lg transition-colors text-gray-400 hover:text-white"
                      title="Minimize"
                    >
                      <Minus size={14} />
                    </button>

                    {/* Maximize/Restore */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMaximize(); }}
                      className="p-1.5 hover:bg-[#1A1A1A] rounded-lg transition-colors text-gray-400 hover:text-white"
                      title={isMaximized ? "Restore" : "Maximize"}
                    >
                      {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>

                    {/* Close */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onClose(); }}
                      className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                      title="Close"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Chat Interface */}
              <LittleLordChat
                tenantId={tenantId}
                userId={userId}
                context={context}
                height={`${size.height - 56}px`}
                showHeader={false}
                className="border-none rounded-none"
              />
            </MotionDiv>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

export default LittleLordGlobalModal;
