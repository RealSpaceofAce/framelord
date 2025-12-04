// =============================================================================
// FRAME SCAN SPEC LOADER — Loads and validates the FrameScan JSON spec
// =============================================================================
// This module loads the master FrameScan specification and validates it at
// runtime to ensure all required structures are present and correctly typed.
// =============================================================================

import rawFrameScanSpec from "../../config/frameScanSpec.json";
import {
  FrameAxisId,
  FRAME_AXIS_IDS,
  FRAME_TEXT_DOMAIN_IDS,
  FRAME_IMAGE_DOMAIN_IDS,
  isFrameAxisId,
} from "./frameTypes";

// =============================================================================
// SPEC TYPE DEFINITIONS
// =============================================================================

/**
 * Frame definition (Apex or Slave)
 */
interface FrameDefinition {
  id: string;
  summary: string;
  traits: string[];
}

/**
 * Win/Win state definition
 */
interface WinWinStateDefinition {
  description: string;
  markers: string[];
}

/**
 * Axis definition from the spec
 */
interface AxisDefinition {
  id: string;
  name: string;
  scale: [number, number];
  description: string;
  bands: {
    strong_slave: string;
    mild_slave: string;
    neutral: string;
    mild_apex: string;
    strong_apex: string;
  };
}

/**
 * Detection rule for an axis
 */
interface AxisDetectionRule {
  positive_cues: string[];
  negative_cues: string[];
  questions_for_model?: string[];
}

/**
 * Domain definition with priority axes
 */
interface DomainDefinition {
  description: string;
  priority_axes: string[];
}

/**
 * Full FrameScan specification type
 */
export interface FrameScanSpec {
  version: string;
  name: string;
  core_model: {
    frames: {
      Apex: FrameDefinition;
      Slave: FrameDefinition;
    };
    win_win_model: {
      states: {
        win_win: WinWinStateDefinition;
        win_lose: WinWinStateDefinition;
        lose_lose: WinWinStateDefinition;
        neutral: WinWinStateDefinition;
      };
      default_expectation: string;
    };
    axes: AxisDefinition[];
    style_guide: {
      tone: string;
      stance_toward_user: string;
      banned_patterns: string[];
      priorities: string[];
    };
  };
  text_scan: {
    output_schema: unknown; // Schema definition, not used at runtime
    detection_rules: Record<string, AxisDetectionRule>;
    domains: Record<string, DomainDefinition>;
    feedback_templates: unknown; // Templates for feedback, optional
  };
  image_scan: {
    output_schema: unknown;
    detection_rules: Record<string, AxisDetectionRule>;
    visual_domains: Record<string, DomainDefinition>;
  };
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validates that the spec has all required top-level keys
 */
function validateTopLevelKeys(spec: unknown): asserts spec is Record<string, unknown> {
  if (typeof spec !== "object" || spec === null) {
    throw new Error("FrameScan spec must be an object");
  }

  const requiredKeys = ["version", "name", "core_model", "text_scan", "image_scan"];
  const specObj = spec as Record<string, unknown>;

  for (const key of requiredKeys) {
    if (!(key in specObj)) {
      throw new Error(`FrameScan spec missing required key: ${key}`);
    }
  }
}

/**
 * Validates the core_model structure
 */
function validateCoreModel(coreModel: unknown): void {
  if (typeof coreModel !== "object" || coreModel === null) {
    throw new Error("core_model must be an object");
  }

  const cm = coreModel as Record<string, unknown>;

  // Check frames
  if (!cm.frames || typeof cm.frames !== "object") {
    throw new Error("core_model.frames must be an object");
  }

  // Check axes
  if (!Array.isArray(cm.axes)) {
    throw new Error("core_model.axes must be an array");
  }

  // Validate each axis ID matches our type union
  const axisIds = (cm.axes as Array<{ id?: string }>).map((a) => a.id);
  const missingAxes = FRAME_AXIS_IDS.filter((id) => !axisIds.includes(id));
  if (missingAxes.length > 0) {
    throw new Error(`core_model.axes missing required axis IDs: ${missingAxes.join(", ")}`);
  }

  const unknownAxes = axisIds.filter((id) => id && !isFrameAxisId(id));
  if (unknownAxes.length > 0) {
    throw new Error(`core_model.axes contains unknown axis IDs: ${unknownAxes.join(", ")}`);
  }

  // Check win_win_model
  if (!cm.win_win_model || typeof cm.win_win_model !== "object") {
    throw new Error("core_model.win_win_model must be an object");
  }
}

/**
 * Validates text_scan domains
 */
function validateTextScanDomains(textScan: unknown): void {
  if (typeof textScan !== "object" || textScan === null) {
    throw new Error("text_scan must be an object");
  }

  const ts = textScan as Record<string, unknown>;

  if (!ts.domains || typeof ts.domains !== "object") {
    throw new Error("text_scan.domains must be an object");
  }

  const domains = ts.domains as Record<string, unknown>;
  const domainKeys = Object.keys(domains);

  if (domainKeys.length === 0) {
    throw new Error("text_scan.domains must not be empty");
  }

  // Validate that all expected text domains are present
  for (const expectedDomain of FRAME_TEXT_DOMAIN_IDS) {
    if (!(expectedDomain in domains)) {
      throw new Error(`text_scan.domains missing expected domain: ${expectedDomain}`);
    }
  }

  // Validate priority_axes in each domain reference valid axis IDs
  for (const [domainId, domainDef] of Object.entries(domains)) {
    const def = domainDef as Record<string, unknown>;
    if (!Array.isArray(def.priority_axes)) {
      throw new Error(`text_scan.domains.${domainId}.priority_axes must be an array`);
    }

    for (const axisId of def.priority_axes as string[]) {
      if (!isFrameAxisId(axisId)) {
        throw new Error(
          `text_scan.domains.${domainId}.priority_axes contains invalid axis ID: ${axisId}`
        );
      }
    }
  }
}

/**
 * Validates image_scan visual_domains
 */
function validateImageScanDomains(imageScan: unknown): void {
  if (typeof imageScan !== "object" || imageScan === null) {
    throw new Error("image_scan must be an object");
  }

  const is = imageScan as Record<string, unknown>;

  if (!is.visual_domains || typeof is.visual_domains !== "object") {
    throw new Error("image_scan.visual_domains must be an object");
  }

  const domains = is.visual_domains as Record<string, unknown>;
  const domainKeys = Object.keys(domains);

  if (domainKeys.length === 0) {
    throw new Error("image_scan.visual_domains must not be empty");
  }

  // Validate that all expected image domains are present
  for (const expectedDomain of FRAME_IMAGE_DOMAIN_IDS) {
    if (!(expectedDomain in domains)) {
      throw new Error(`image_scan.visual_domains missing expected domain: ${expectedDomain}`);
    }
  }

  // Validate priority_axes in each domain reference valid axis IDs
  for (const [domainId, domainDef] of Object.entries(domains)) {
    const def = domainDef as Record<string, unknown>;
    if (!Array.isArray(def.priority_axes)) {
      throw new Error(`image_scan.visual_domains.${domainId}.priority_axes must be an array`);
    }

    for (const axisId of def.priority_axes as string[]) {
      if (!isFrameAxisId(axisId)) {
        throw new Error(
          `image_scan.visual_domains.${domainId}.priority_axes contains invalid axis ID: ${axisId}`
        );
      }
    }
  }
}

/**
 * Performs full validation of the FrameScan spec
 */
function validateFrameScanSpec(spec: unknown): FrameScanSpec {
  validateTopLevelKeys(spec);

  const specObj = spec as Record<string, unknown>;

  validateCoreModel(specObj.core_model);
  validateTextScanDomains(specObj.text_scan);
  validateImageScanDomains(specObj.image_scan);

  return spec as unknown as FrameScanSpec;
}

// =============================================================================
// EXPORTED SPEC
// =============================================================================

/**
 * The validated FrameScan specification.
 * Throws at module load time if the spec is invalid.
 */
export const frameScanSpec: FrameScanSpec = validateFrameScanSpec(rawFrameScanSpec);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get axis definition by ID
 */
export function getAxisDefinition(axisId: FrameAxisId): AxisDefinition | undefined {
  return frameScanSpec.core_model.axes.find((axis) => axis.id === axisId);
}

/**
 * Get all axis definitions
 */
export function getAllAxisDefinitions(): AxisDefinition[] {
  return frameScanSpec.core_model.axes;
}

/**
 * Get text domain definition
 */
export function getTextDomainDefinition(domainId: string): DomainDefinition | undefined {
  return frameScanSpec.text_scan.domains[domainId];
}

/**
 * Get image domain definition
 */
export function getImageDomainDefinition(domainId: string): DomainDefinition | undefined {
  return frameScanSpec.image_scan.visual_domains[domainId];
}

/**
 * Get priority axes for a domain (text or image)
 */
export function getDomainPriorityAxes(domainId: string): FrameAxisId[] {
  // Try text domain first
  const textDomain = getTextDomainDefinition(domainId);
  if (textDomain) {
    return textDomain.priority_axes.filter(isFrameAxisId);
  }

  // Try image domain
  const imageDomain = getImageDomainDefinition(domainId);
  if (imageDomain) {
    return imageDomain.priority_axes.filter(isFrameAxisId);
  }

  // Fallback to empty array
  return [];
}

/**
 * Get detection rules for an axis from text_scan
 */
export function getTextDetectionRules(axisId: FrameAxisId): AxisDetectionRule | undefined {
  return frameScanSpec.text_scan.detection_rules[axisId];
}

/**
 * Get detection rules for an axis from image_scan
 */
export function getImageDetectionRules(axisId: FrameAxisId): AxisDetectionRule | undefined {
  return frameScanSpec.image_scan.detection_rules[axisId];
}

