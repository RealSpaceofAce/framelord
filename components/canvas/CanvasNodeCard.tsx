// =============================================================================
// CANVAS NODE CARD — Frame card with Affine editor, mic, and full resize
// =============================================================================
// Draggable, resizable Frame node with Affine block editor.
// Supports microphone transcription, all-direction resize, and connections.
// =============================================================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical, Trash2, Link2, Mic, Square } from 'lucide-react';
import type { CanvasNode } from '../../stores/canvasStore';
import { AffineNoteEditor } from './AffineNoteEditor';
import { updateNodeAffineContent } from '../../stores/canvasStore';

interface CanvasNodeCardProps {
  node: CanvasNode;
  zoom: number;
  isSelected: boolean;
  isConnectionSource?: boolean;
  tool?: string;
  onSelect: (nodeId: string) => void;
  onUpdate: (nodeId: string, updates: Partial<CanvasNode>) => void;
  onDelete: (nodeId: string) => void;
  onStartConnection: (nodeId: string) => void;
}

type ResizeHandle =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w';

export const CanvasNodeCard: React.FC<CanvasNodeCardProps> = ({
  node,
  zoom,
  isSelected,
  isConnectionSource,
  tool,
  onSelect,
  onUpdate,
  onDelete,
  onStartConnection,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(node.title);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeResizeHandle, setActiveResizeHandle] = useState<ResizeHandle | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const dragStartPos = useRef<{ x: number; y: number; nodeX: number; nodeY: number } | null>(null);
  const resizeStartState = useRef<{
    width: number;
    height: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const editorRef = useRef<{ insertText: (text: string) => void } | null>(null);

  // Update local title when node prop changes
  useEffect(() => {
    setTitleValue(node.title);
  }, [node.title]);

  // Microphone recording handlers
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // TODO: Send to real transcription backend with Frame Credits
        // const transcription = await transcribeAudio(audioBlob);

        // For now, use stub transcription
        const transcribedText = await transcribeAudioStub(audioBlob);

        // Insert transcribed text into editor
        if (editorRef.current) {
          editorRef.current.insertText(transcribedText);
        }

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingError(null);
    } catch (error) {
      console.error('[Mic] Failed to start recording:', error);
      setRecordingError('Microphone access denied');
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleMicClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Drag handler
  const handleMouseDownDrag = useCallback(
    (e: React.MouseEvent) => {
      // Only allow dragging in select mode (not in hand tool or other modes)
      if (isEditingTitle || isResizing || tool !== 'select') return;

      e.stopPropagation();
      onSelect(node.id);
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX,
        y: e.clientY,
        nodeX: node.x,
        nodeY: node.y,
      };
    },
    [node.id, node.x, node.y, onSelect, isEditingTitle, isResizing, tool]
  );

  // Resize handler
  const handleMouseDownResize = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      e.stopPropagation();
      setIsResizing(true);
      setActiveResizeHandle(handle);
      resizeStartState.current = {
        width: node.width,
        height: node.height,
        x: node.x,
        y: node.y,
        startX: e.clientX,
        startY: e.clientY,
      };
    },
    [node.width, node.height, node.x, node.y]
  );

  // Mouse move and up handlers
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && dragStartPos.current) {
        const dx = (e.clientX - dragStartPos.current.x) / zoom;
        const dy = (e.clientY - dragStartPos.current.y) / zoom;

        onUpdate(node.id, {
          x: dragStartPos.current.nodeX + dx,
          y: dragStartPos.current.nodeY + dy,
        });
      }

      if (isResizing && resizeStartState.current && activeResizeHandle) {
        const dx = (e.clientX - resizeStartState.current.startX) / zoom;
        const dy = (e.clientY - resizeStartState.current.startY) / zoom;

        const handle = activeResizeHandle;
        let newWidth = resizeStartState.current.width;
        let newHeight = resizeStartState.current.height;
        let newX = resizeStartState.current.x;
        let newY = resizeStartState.current.y;

        // Calculate new dimensions based on handle
        if (handle.includes('e')) newWidth += dx;
        if (handle.includes('w')) {
          newWidth -= dx;
          newX += dx;
        }
        if (handle.includes('s')) newHeight += dy;
        if (handle.includes('n')) {
          newHeight -= dy;
          newY += dy;
        }

        // Enforce minimums
        if (newWidth < 250) {
          newWidth = 250;
          newX = handle.includes('w') ? resizeStartState.current.x + resizeStartState.current.width - 250 : resizeStartState.current.x;
        }
        if (newHeight < 180) {
          newHeight = 180;
          newY = handle.includes('n') ? resizeStartState.current.y + resizeStartState.current.height - 180 : resizeStartState.current.y;
        }

        onUpdate(node.id, {
          width: newWidth,
          height: newHeight,
          x: newX,
          y: newY,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setActiveResizeHandle(null);
      dragStartPos.current = null;
      resizeStartState.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, activeResizeHandle, node.id, zoom, onUpdate]);

  const handleTitleSave = useCallback(() => {
    if (titleValue.trim()) {
      onUpdate(node.id, { title: titleValue.trim() });
    }
    setIsEditingTitle(false);
  }, [node.id, titleValue, onUpdate]);

  const handleContentChange = useCallback(
    (serialized: any) => {
      updateNodeAffineContent(node.id, serialized);
      // Also update plain text body as fallback
      onUpdate(node.id, { body: serialized.text || '' });
    },
    [node.id, onUpdate]
  );

  const renderResizeHandle = (handle: ResizeHandle, className: string) => {
    const isCorner = handle.length === 2;
    return (
      <div
        key={handle}
        className={`absolute ${className} ${isCorner ? 'w-3 h-3' : handle.includes('n') || handle.includes('s') ? 'h-1 left-2 right-2' : 'w-1 top-2 bottom-2'
          } ${isSelected ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity z-10`}
        onMouseDown={(e) => handleMouseDownResize(e, handle)}
        style={{
          cursor:
            handle === 'nw' || handle === 'se'
              ? 'nwse-resize'
              : handle === 'ne' || handle === 'sw'
                ? 'nesw-resize'
                : handle === 'n' || handle === 's'
                  ? 'ns-resize'
                  : 'ew-resize',
          background: isCorner ? '#4f46e5' : 'transparent',
          borderRadius: isCorner ? '50%' : '0',
        }}
      />
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        cursor: isDragging ? 'grabbing' : 'default',
        pointerEvents: 'auto', // Enable pointer events for this card
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      className={`bg-[#1E2028] rounded-xl shadow-2xl overflow-hidden flex flex-col group ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-[#2A2D35]'
        }`}
    >
      {/* Resize handles - all 8 */}
      {renderResizeHandle('nw', '-top-1.5 -left-1.5')}
      {renderResizeHandle('n', '-top-0.5')}
      {renderResizeHandle('ne', '-top-1.5 -right-1.5')}
      {renderResizeHandle('e', '-right-0.5')}
      {renderResizeHandle('se', '-bottom-1.5 -right-1.5')}
      {renderResizeHandle('s', '-bottom-0.5')}
      {renderResizeHandle('sw', '-bottom-1.5 -left-1.5')}
      {renderResizeHandle('w', '-left-0.5')}

      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-[#12141A] border-b border-[#2A2D35] cursor-grab active:cursor-grabbing flex-shrink-0"
        onMouseDown={handleMouseDownDrag}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GripVertical size={14} className="text-gray-600 flex-shrink-0" />
          {isEditingTitle ? (
            <input
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') {
                  setTitleValue(node.title);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="flex-1 px-2 py-0.5 bg-[#2A2D35] border border-indigo-500 rounded text-white text-sm focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              className="flex-1 text-sm font-medium text-white truncate cursor-text"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditingTitle(true);
              }}
            >
              {node.title}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMicClick();
            }}
            className={`p-1 rounded transition-colors ${isRecording
              ? 'text-red-400 bg-red-400/20 animate-pulse'
              : 'text-gray-500 hover:text-indigo-400 hover:bg-indigo-400/10'
              }`}
            title={isRecording ? 'Stop recording' : 'Record voice note'}
          >
            <Mic size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnection(node.id);
            }}
            className="p-1 text-gray-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded transition-colors"
            title="Create connection"
          >
            <Link2 size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
            title="Delete node"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Body - Affine Editor */}
      <div
        className="flex-1 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <AffineNoteEditor node={node} onContentChange={handleContentChange} ref={editorRef} />
      </div>

      {/* Recording error */}
      {recordingError && (
        <div className="absolute bottom-2 left-2 right-2 bg-red-500/90 text-white text-xs py-1 px-2 rounded">
          {recordingError}
        </div>
      )}
    </div>
  );
};

// Stub transcription function
// TODO: Replace with real backend call that:
// 1. Checks Frame Credits balance
// 2. Uploads audio to transcription service (OpenAI Whisper, etc.)
// 3. Deducts credits after successful transcription
// 4. Returns transcribed text
async function transcribeAudioStub(audioBlob: Blob): Promise<string> {
  console.log('[Transcription] Audio blob size:', audioBlob.size, 'bytes');

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Return placeholder text
  return `This is a placeholder transcription.

To enable real transcription:
- Wire up backend transcription service (OpenAI Whisper, Google Speech-to-Text, etc.)
- Integrate with Frame Credits system
- Replace this stub in CanvasNodeCard.tsx

Audio recorded: ${new Date().toLocaleTimeString()}
Size: ${(audioBlob.size / 1024).toFixed(1)} KB`;
}

export default CanvasNodeCard;
