// =============================================================================
// WANT COVER IMAGE — Cover image component for Want display
// =============================================================================
// Uses shadcn Card + AspectRatio for consistent display.
// Supports upload, remove, and hover states.
// =============================================================================

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePlus, Edit2, X, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { AspectRatio } from '../../ui/AspectRatio';
import { Skeleton } from '../../ui/Skeleton';

const MotionDiv = motion.div as any;

interface WantCoverImageProps {
  /** Cover image URL (data URL or remote URL) */
  imageUrl: string | null | undefined;
  /** Callback when image is uploaded (receives data URL) */
  onUpload: (dataUrl: string) => void;
  /** Callback when image is removed */
  onRemove: () => void;
  /** Whether the component is read-only */
  readOnly?: boolean;
  /** Aspect ratio for the image (default 16/9) */
  ratio?: number;
  /** Additional className */
  className?: string;
}

export const WantCoverImage: React.FC<WantCoverImageProps> = ({
  imageUrl,
  onUpload,
  onRemove,
  readOnly = false,
  ratio = 16 / 9,
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    // Convert to data URL
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onUpload(dataUrl);
      setIsLoading(false);
    };
    reader.onerror = () => {
      setIsLoading(false);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Empty state - show upload prompt
  if (!imageUrl) {
    if (readOnly) {
      return null; // Don't show anything in read-only mode without image
    }

    return (
      <Card
        className={cn(
          "cursor-pointer border-dashed border-2 border-border hover:border-primary/50 transition-colors group overflow-hidden",
          className
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <AspectRatio ratio={ratio}>
          <div className="w-full h-full flex items-center justify-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors bg-muted/30">
            <ImagePlus size={24} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Add cover image</span>
          </div>
        </AspectRatio>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <AspectRatio ratio={ratio}>
          <Skeleton className="w-full h-full" />
        </AspectRatio>
      </Card>
    );
  }

  // Image loaded state
  return (
    <Card
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <AspectRatio ratio={ratio}>
        <img
          src={imageUrl}
          alt="Want cover"
          className="w-full h-full object-cover"
        />
      </AspectRatio>

      {/* Hover overlay with actions */}
      {!readOnly && (
        <AnimatePresence>
          {isHovering && (
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 flex items-center justify-center gap-3"
            >
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5"
              >
                <Edit2 size={14} />
                Change
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onRemove}
                className="gap-1.5"
              >
                <X size={14} />
                Remove
              </Button>
            </MotionDiv>
          )}
        </AnimatePresence>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </Card>
  );
};

export default WantCoverImage;
