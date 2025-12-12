/**
 * NanoBanana Client — Image annotation via Vercel proxy
 *
 * Calls /api/nanobanana-annotate serverless function.
 * API keys are kept server-side only.
 */

import type { FrameImageAnnotation, FrameAnnotationSeverity } from "../frameScan/frameTypes";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result from Nano Banana image annotation.
 * Contains structured annotations aligned with FrameImageAnnotation type.
 */
export interface NanoBananaResult {
  /** Array of detected annotations with normalized coordinates */
  annotations: FrameImageAnnotation[];
  /** Optional URL to annotated/processed image with visual overlays */
  annotatedImageUrl?: string;
}

/**
 * Raw annotation shape from the NanoBanana API response.
 */
interface RawNanoBananaAnnotation {
  id?: string;
  label?: string;
  description?: string;
  severity?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/**
 * Raw response shape from the NanoBanana API.
 */
interface RawNanoBananaResponse {
  annotations?: RawNanoBananaAnnotation[];
  annotatedImageUrl?: string;
}

// =============================================================================
// RESPONSE MAPPING
// =============================================================================

const VALID_SEVERITIES: FrameAnnotationSeverity[] = ["info", "warning", "critical"];

/**
 * Clamp a number to the [0, 1] range.
 */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Validate that a value is a finite number.
 */
function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Map raw NanoBanana API response to our internal format.
 */
function mapNanoBananaResponse(json: RawNanoBananaResponse): NanoBananaResult {
  const rawAnnotations = Array.isArray(json.annotations) ? json.annotations : [];

  const mappedAnnotations: FrameImageAnnotation[] = [];

  for (let i = 0; i < rawAnnotations.length; i++) {
    const raw = rawAnnotations[i];

    // Skip annotations with invalid or missing bounding box coordinates
    if (
      !isValidNumber(raw.x) ||
      !isValidNumber(raw.y) ||
      !isValidNumber(raw.width) ||
      !isValidNumber(raw.height)
    ) {
      console.warn(`NanoBanana: Skipping annotation[${i}] with invalid coordinates`);
      continue;
    }

    // Map id with fallback
    const id = typeof raw.id === "string" && raw.id.trim().length > 0
      ? raw.id.trim()
      : `nb-${i}`;

    // Map label with fallback
    const label = typeof raw.label === "string" && raw.label.trim().length > 0
      ? raw.label.trim()
      : "region";

    // Map description with fallback
    const description = typeof raw.description === "string" && raw.description.trim().length > 0
      ? raw.description.trim()
      : label;

    // Map severity with validation and fallback
    const severity: FrameAnnotationSeverity =
      typeof raw.severity === "string" && VALID_SEVERITIES.includes(raw.severity as FrameAnnotationSeverity)
        ? (raw.severity as FrameAnnotationSeverity)
        : "info";

    mappedAnnotations.push({
      id,
      label,
      description,
      severity,
      x: clamp01(raw.x),
      y: clamp01(raw.y),
      width: clamp01(raw.width),
      height: clamp01(raw.height),
    });
  }

  return {
    annotations: mappedAnnotations,
    annotatedImageUrl: typeof json.annotatedImageUrl === "string" ? json.annotatedImageUrl : undefined,
  };
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Call Nano Banana to annotate an image via Vercel proxy.
 *
 * @param imageIdOrUrl - URL to the image or a file ID/reference
 * @returns Annotation result with detected elements and optional annotated image URL
 * @throws Error if the API request fails
 */
export async function callNanoBananaAnnotateImage(
  imageIdOrUrl: string
): Promise<NanoBananaResult> {
  const res = await fetch("/api/nanobanana-annotate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageUrl: imageIdOrUrl,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(
      `[NanoBanana] API error: ${res.status} - ${data.error || res.statusText}`
    );
  }

  const json = await res.json();

  // The proxy returns { annotations: ... } which contains the raw response
  return mapNanoBananaResponse(json.annotations || json);
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Check if Nano Banana service is available.
 * In production, always true since API key is server-side.
 */
export function isNanoBananaAvailable(): boolean {
  return true;
}
