// =============================================================================
// FRAME SCAN HOOKS — React hooks for running FrameScan analyses
// =============================================================================
// These hooks provide a clean React interface for text and image FrameScans.
// They handle loading states, errors, and result management.
// =============================================================================

import { useState, useCallback } from "react";
import {
  runTextFrameScan,
  runImageFrameScan,
  TextFrameScanInput,
  ImageFrameScanInput,
  FrameScore,
  FrameImageScanResult,
} from "@/lib/frameScan";

// =============================================================================
// TYPES
// =============================================================================

type FrameScanStatus = "idle" | "running" | "success" | "error";

// =============================================================================
// TEXT FRAMESCAN HOOK
// =============================================================================

export interface UseTextFrameScanReturn {
  /** Current scan status */
  status: FrameScanStatus;
  /** The resulting FrameScore (0-100 with breakdown) */
  result: FrameScore | null;
  /** Error message if scan failed */
  error: string | null;
  /** Function to trigger a text scan */
  scan: (input: TextFrameScanInput) => Promise<void>;
  /** Reset to idle state */
  reset: () => void;
}

/**
 * Hook for running text-based FrameScans.
 *
 * @example
 * ```tsx
 * const { status, result, error, scan } = useTextFrameScan();
 *
 * const handleScan = async () => {
 *   await scan({
 *     domain: "sales_email",
 *     content: "Hi, I hope you don't mind me reaching out...",
 *   });
 * };
 *
 * if (result) {
 *   console.log(`Frame Score: ${result.frameScore}/100`);
 * }
 * ```
 */
export function useTextFrameScan(): UseTextFrameScanReturn {
  const [status, setStatus] = useState<FrameScanStatus>("idle");
  const [result, setResult] = useState<FrameScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (input: TextFrameScanInput) => {
    setStatus("running");
    setError(null);
    setResult(null);

    try {
      const score = await runTextFrameScan(input);
      setResult(score);
      setStatus("success");
    } catch (err: any) {
      console.error("Text frame scan failed:", err);
      setError(err?.message ?? "Text frame scan failed");
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, scan, reset };
}

// =============================================================================
// IMAGE FRAMESCAN HOOK
// =============================================================================

export interface UseImageFrameScanReturn {
  /** Current scan status */
  status: FrameScanStatus;
  /** The resulting FrameImageScanResult (score + annotations + optional annotated URL) */
  result: FrameImageScanResult | null;
  /** Error message if scan failed */
  error: string | null;
  /** Function to trigger an image scan */
  scan: (input: ImageFrameScanInput) => Promise<void>;
  /** Reset to idle state */
  reset: () => void;
}

/**
 * Hook for running image-based FrameScans.
 *
 * Returns both the 0-100 score and structured annotations for on-image callouts.
 *
 * @example
 * ```tsx
 * const { status, result, error, scan } = useImageFrameScan();
 *
 * const handleScan = async () => {
 *   await scan({
 *     domain: "profile_photo",
 *     imageIdOrUrl: "https://example.com/photo.jpg",
 *     description: "LinkedIn profile photo for men's coach",
 *   });
 * };
 *
 * if (result) {
 *   console.log(`Frame Score: ${result.score.frameScore}/100`);
 *   console.log(`Annotations: ${result.annotations.length}`);
 *   if (result.annotatedImageUrl) {
 *     // Show the annotated image
 *   }
 * }
 * ```
 */
export function useImageFrameScan(): UseImageFrameScanReturn {
  const [status, setStatus] = useState<FrameScanStatus>("idle");
  const [result, setResult] = useState<FrameImageScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (input: ImageFrameScanInput) => {
    setStatus("running");
    setError(null);
    setResult(null);

    try {
      const res = await runImageFrameScan(input);
      setResult(res);
      setStatus("success");
    } catch (err: any) {
      console.error("Image frame scan failed:", err);
      setError(err?.message ?? "Image frame scan failed");
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, scan, reset };
}






