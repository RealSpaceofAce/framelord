/**
 * NanoBanana Client
 *
 * Assumes a generic POST /v1/annotate API that accepts { imageUrl, options }
 * and returns { annotations, annotatedImageUrl }.
 *
 * When we get the real NanoBanana spec, only this file should need to change.
 *
 * Environment variables:
 * - VITE_NANOBANANA_API_URL: Base URL for the API (default: placeholder)
 * - VITE_NANOBANANA_API_KEY: API key (or set in user Settings)
 */

import { resolveApiKey } from "./providers";
import type { FrameImageAnnotation, FrameAnnotationSeverity } from "../frameScan/frameTypes";

// =============================================================================
// CONFIG
// =============================================================================

/**
 * Base URL for the NanoBanana API.
 * TODO: Update this placeholder URL when we have the real NanoBanana endpoint.
 */
const NANO_BANANA_BASE_URL =
  (import.meta as any).env?.VITE_NANOBANANA_API_URL || "https://api.nanobanana.example.com";

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
 * TODO: Adjust this interface when we have the real API spec.
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
 * TODO: Adjust this interface when we have the real API spec.
 */
interface RawNanoBananaResponse {
  annotations?: RawNanoBananaAnnotation[];
  annotatedImageUrl?: string;
}

// =============================================================================
// MOCK RESPONSES
// =============================================================================

/**
 * Returns a mock annotation result when no API key is configured.
 */
function getMockAnnotationResult(): NanoBananaResult {
  return {
    annotations: [
      {
        id: "mock-1",
        label: "Mock region",
        description: "Mock annotation. No real image analysis performed. Set VITE_NANOBANANA_API_KEY to enable real analysis.",
        severity: "info",
        x: 0.4,
        y: 0.3,
        width: 0.2,
        height: 0.2,
      },
    ],
    annotatedImageUrl: undefined,
  };
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
 * TODO: Adjust mapping logic when we have the real API response format.
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
 * Call Nano Banana to annotate an image.
 *
 * @param imageIdOrUrl - URL to the image or a file ID/reference
 * @returns Annotation result with detected elements and optional annotated image URL
 * @throws Error if the API request fails
 */
export async function callNanoBananaAnnotateImage(
  imageIdOrUrl: string
): Promise<NanoBananaResult> {
  const apiKey = resolveApiKey("nanobanana_image");

  // Return mock response if no API key configured
  if (!apiKey) {
    console.warn(
      "[NanoBanana] Running in MOCK MODE - no API key configured. " +
        "Set VITE_NANOBANANA_API_KEY env var or configure in Settings to enable real image analysis."
    );
    return getMockAnnotationResult();
  }

  // Build request URL
  // TODO: Update endpoint path when we have the real NanoBanana API spec
  const url = `${NANO_BANANA_BASE_URL.replace(/\/$/, "")}/v1/annotate`;

  // Build request body
  // TODO: Adjust request body shape when we have the real NanoBanana API spec
  const body = {
    imageUrl: imageIdOrUrl,
    options: {
      returnAnnotatedImage: true,
    },
  };

  // Perform HTTP request
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(
      `[NanoBanana] Network error calling ${url}: ${(err as Error).message}`
    );
  }

  // Handle non-OK responses
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const truncated = text.slice(0, 300);
    throw new Error(
      `[NanoBanana] API error: ${res.status} ${res.statusText} - ${truncated}`
    );
  }

  // Parse JSON response
  let json: RawNanoBananaResponse;
  try {
    json = await res.json();
  } catch (err) {
    throw new Error(
      `[NanoBanana] Failed to parse JSON response: ${(err as Error).message}`
    );
  }

  // Map response to our internal format
  return mapNanoBananaResponse(json);
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Check if Nano Banana service is available (has API key configured).
 */
export function isNanoBananaAvailable(): boolean {
  const apiKey = resolveApiKey("nanobanana_image");
  return apiKey !== null;
}

/**
 * Get the configured NanoBanana API base URL (for debugging/testing).
 */
export function getNanoBananaBaseUrl(): string {
  return NANO_BANANA_BASE_URL;
}
