// =============================================================================
// NOTE CANVAS TOOLBAR — Floating toolbar for canvas/edgeless mode
// =============================================================================
// Modern minimal toolbar with tool icons. Appears at bottom-left of canvas.
// Supports: select, text, shape (rect, circle, triangle, diamond),
// connector, brush, pan, zoom controls, color picker, and fullscreen.
// =============================================================================

import React, { useState, useRef } from 'react';
import {
  MousePointer2,
  Type,
  Square,
  Circle,
  Triangle,
  Diamond,
  ArrowRight,
  Pencil,
  Hand,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  ChevronDown,
  Palette,
  Maximize2,
  Minimize2,
} from 'lucide-react';

// Tool types
export type CanvasTool = 'select' | 'text' | 'shape' | 'connector' | 'brush' | 'pan';
export type ShapeType = 'rect' | 'circle' | 'triangle' | 'diamond';

// Preset colors
const PRESET_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#ffffff', // White
  '#000000', // Black
  '#71717a', // Gray
];

interface ToolbarProps {
  activeTool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  onShapeCreate?: (shapeType: ShapeType) => void;
  onImageUpload?: (file: File) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  selectedColor?: string;
  onColorChange?: (color: string) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function NoteCanvasToolbar({
  activeTool,
  onToolChange,
  onShapeCreate,
  onImageUpload,
  zoom,
  onZoomChange,
  selectedColor = '#3b82f6',
  onColorChange,
  isFullscreen = false,
  onToggleFullscreen,
}: ToolbarProps) {
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tool definitions
  const tools: Array<{ id: CanvasTool; icon: React.ReactNode; label: string }> = [
    { id: 'select', icon: <MousePointer2 size={18} />, label: 'Select (V)' },
    { id: 'text', icon: <Type size={18} />, label: 'Text (T)' },
    { id: 'shape', icon: <Square size={18} />, label: 'Shape (S)' },
    { id: 'connector', icon: <ArrowRight size={18} />, label: 'Connector (C)' },
    { id: 'brush', icon: <Pencil size={18} />, label: 'Brush (B)' },
    { id: 'pan', icon: <Hand size={18} />, label: 'Pan (H)' },
  ];

  // Shape options
  const shapes: Array<{ type: ShapeType; icon: React.ReactNode; label: string }> = [
    { type: 'rect', icon: <Square size={18} />, label: 'Rectangle' },
    { type: 'circle', icon: <Circle size={18} />, label: 'Circle' },
    { type: 'triangle', icon: <Triangle size={18} />, label: 'Triangle' },
    { type: 'diamond', icon: <Diamond size={18} />, label: 'Diamond' },
  ];

  const handleToolClick = (tool: CanvasTool) => {
    if (tool === 'shape') {
      setShowShapeMenu(!showShapeMenu);
    } else {
      setShowShapeMenu(false);
      onToolChange(tool);
    }
  };

  const handleShapeSelect = (shapeType: ShapeType) => {
    setShowShapeMenu(false);
    onToolChange('shape');
    onShapeCreate?.(shapeType);
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      onImageUpload(file);
    }
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 10, 200);
    onZoomChange(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 10, 10);
    onZoomChange(newZoom);
  };

  return (
    <div className="absolute bottom-6 left-6 z-50">
      {/* Main toolbar */}
      <div className="flex items-center gap-1 bg-[#191919] border border-[#27272a] rounded-lg shadow-lg p-2">
        {/* Tools */}
        <div className="flex items-center gap-1 pr-2 border-r border-[#27272a]">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              className={`
                relative p-2 rounded-md transition-all
                ${activeTool === tool.id
                  ? 'bg-[#3b82f6] text-white'
                  : 'text-[#a1a1aa] hover:bg-[#27272a] hover:text-white'
                }
              `}
              title={tool.label}
            >
              {tool.icon}
              {tool.id === 'shape' && (
                <ChevronDown size={10} className="absolute bottom-0 right-0" />
              )}
            </button>
          ))}
        </div>

        {/* Image upload */}
        <div className="flex items-center gap-1 pr-2 border-r border-[#27272a]">
          <button
            onClick={handleImageClick}
            className="p-2 rounded-md text-[#a1a1aa] hover:bg-[#27272a] hover:text-white transition-all"
            title="Upload Image"
          >
            <ImageIcon size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 pr-2 border-r border-[#27272a]">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-md text-[#a1a1aa] hover:bg-[#27272a] hover:text-white transition-all"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <span className="text-xs text-[#a1a1aa] min-w-[3rem] text-center">
            {zoom}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-md text-[#a1a1aa] hover:bg-[#27272a] hover:text-white transition-all"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
        </div>

        {/* Color picker */}
        <div className="relative flex items-center gap-1 pr-2 border-r border-[#27272a]">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 rounded-md text-[#a1a1aa] hover:bg-[#27272a] hover:text-white transition-all flex items-center gap-1"
            title="Color"
          >
            <Palette size={18} />
            <div
              className="w-3 h-3 rounded-sm border border-[#3f3f46]"
              style={{ backgroundColor: selectedColor }}
            />
          </button>
        </div>

        {/* Fullscreen toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleFullscreen}
            className="p-2 rounded-md text-[#a1a1aa] hover:bg-[#27272a] hover:text-white transition-all"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* Shape picker menu */}
      {showShapeMenu && (
        <div className="absolute bottom-full left-0 mb-2 bg-[#191919] border border-[#27272a] rounded-lg shadow-lg p-2">
          <div className="flex flex-col gap-1">
            {shapes.map((shape) => (
              <button
                key={shape.type}
                onClick={() => handleShapeSelect(shape.type)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-[#a1a1aa] hover:bg-[#27272a] hover:text-white transition-all text-sm"
              >
                {shape.icon}
                <span>{shape.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Color picker menu */}
      {showColorPicker && (
        <div className="absolute bottom-full right-16 mb-2 bg-[#191919] border border-[#27272a] rounded-lg shadow-lg p-3">
          <div className="grid grid-cols-5 gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  onColorChange?.(color);
                  setShowColorPicker(false);
                }}
                className={`w-6 h-6 rounded-md border-2 transition-all hover:scale-110 ${
                  selectedColor === color ? 'border-white' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NoteCanvasToolbar;
