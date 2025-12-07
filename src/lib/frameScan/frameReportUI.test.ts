// =============================================================================
// FRAME REPORT UI TESTS — Tests for UI schema and builder
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildFrameScanUIReport,
  buildFallbackUIReport,
  buildFrameScanUIReportSafe,
  type FrameScanUIReport,
  type FrameReportUIBuildContext,
} from "./frameReportUI";
import type { FrameScanResult, FrameScore } from "./frameTypes";
import * as openaiClient from "../llm/openaiClient";

// Mock the OpenAI client
vi.mock("../llm/openaiClient", () => ({
  callOpenAIChat: vi.fn(),
}));

describe("frameReportUI", () => {
  // Sample test data
  const sampleRawResult: FrameScanResult = {
    modality: "text",
    domain: "sales_email",
    overallFrame: "apex",
    overallWinWinState: "win_win",
    axes: [
      { axisId: "assumptive_state", score: 2, band: "mild_apex", notes: "Confident tone" },
      { axisId: "buyer_seller_position", score: 1, band: "mild_apex", notes: "Positioned as buyer" },
      { axisId: "identity_vs_tactic", score: 0, band: "neutral", notes: "Balanced approach" },
      { axisId: "internal_sale", score: 2, band: "mild_apex", notes: "Strong conviction" },
      { axisId: "win_win_integrity", score: 3, band: "strong_apex", notes: "Clear mutual benefit" },
      { axisId: "persuasion_style", score: 1, band: "mild_apex", notes: "Direct communication" },
      { axisId: "pedestalization", score: -1, band: "mild_slave", notes: "Slight over-valuing" },
      { axisId: "self_trust_vs_permission", score: 2, band: "mild_apex", notes: "Self-directed" },
      { axisId: "field_strength", score: 1, band: "mild_apex", notes: "Clear intent" },
    ],
    diagnostics: {
      primaryPatterns: ["strong internal sale", "clear boundaries"],
      supportingEvidence: ["Uses direct language", "Sets clear expectations"],
    },
    corrections: {
      topShifts: [
        {
          axisId: "pedestalization",
          shift: "Reduce over-valuing of recipient",
          protocolSteps: ["Remove excessive praise", "Focus on value exchange"],
        },
      ],
      sampleRewrites: [
        {
          purpose: "Opening line",
          apexVersion: "I have a proposal that could benefit both of us.",
        },
      ],
    },
  };

  const sampleScore: FrameScore = {
    frameScore: 75,
    overallFrame: "apex",
    overallWinWinState: "win_win",
    domain: "sales_email",
    axisScores: sampleRawResult.axes,
    weightedAxisScores: sampleRawResult.axes.map(a => ({
      axisId: a.axisId,
      normalizedScore: ((a.score + 3) / 6) * 100,
      weight: 1,
    })),
    notes: ["Strong apex frame detected"],
  };

  const sampleContext: FrameReportUIBuildContext = {
    modality: "text",
    domain: "sales_email",
    subjectLabel: "Sales email to John",
  };

  const mockUIReport: FrameScanUIReport = {
    header: {
      title: "Sales Email Analysis",
      oneLineVerdict: "Strong apex frame with win-win dynamics",
      highlightScore: 75,
      badges: ["apex", "win-win", "strong boundaries"],
    },
    sections: [
      {
        id: "summary",
        title: "Summary",
        mainParagraph: "This sales email demonstrates strong apex frame characteristics.",
        bullets: ["Clear value proposition", "Balanced communication"],
      },
      {
        id: "strengths",
        title: "Strengths",
        bullets: ["Strong internal sale", "Clear win-win framing"],
      },
      {
        id: "weaknesses",
        title: "Weaknesses",
        bullets: ["Slight over-valuing of recipient"],
      },
      {
        id: "corrections",
        title: "Corrections",
        corrections: [
          {
            label: "Pedestalization",
            description: "Reduce over-valuing of recipient",
            suggestedAction: "Remove excessive praise and focus on value exchange",
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("buildFrameScanUIReport", () => {
    it("returns a valid FrameScanUIReport when LLM returns valid JSON", async () => {
      vi.mocked(openaiClient.callOpenAIChat).mockResolvedValue({
        rawText: JSON.stringify(mockUIReport),
      });

      const result = await buildFrameScanUIReport(sampleRawResult, sampleScore, sampleContext);

      expect(result).toBeDefined();
      expect(result.header).toBeDefined();
      expect(result.sections).toBeDefined();
      expect(Array.isArray(result.sections)).toBe(true);
    });

    it("includes required sections (summary, strengths, weaknesses, corrections)", async () => {
      vi.mocked(openaiClient.callOpenAIChat).mockResolvedValue({
        rawText: JSON.stringify(mockUIReport),
      });

      const result = await buildFrameScanUIReport(sampleRawResult, sampleScore, sampleContext);

      const sectionIds = result.sections.map(s => s.id);
      expect(sectionIds).toContain("summary");
      expect(sectionIds).toContain("strengths");
      expect(sectionIds).toContain("weaknesses");
      expect(sectionIds).toContain("corrections");
    });

    it("has header with title, oneLineVerdict, highlightScore, and badges", async () => {
      vi.mocked(openaiClient.callOpenAIChat).mockResolvedValue({
        rawText: JSON.stringify(mockUIReport),
      });

      const result = await buildFrameScanUIReport(sampleRawResult, sampleScore, sampleContext);

      expect(typeof result.header.title).toBe("string");
      expect(typeof result.header.oneLineVerdict).toBe("string");
      expect(typeof result.header.highlightScore).toBe("number");
      expect(Array.isArray(result.header.badges)).toBe(true);
    });

    it("parses JSON embedded in other text", async () => {
      vi.mocked(openaiClient.callOpenAIChat).mockResolvedValue({
        rawText: `Here is the report:\n${JSON.stringify(mockUIReport)}\n\nDone.`,
      });

      const result = await buildFrameScanUIReport(sampleRawResult, sampleScore, sampleContext);

      expect(result).toBeDefined();
      expect(result.header).toBeDefined();
    });

    it("throws when JSON is invalid", async () => {
      vi.mocked(openaiClient.callOpenAIChat).mockResolvedValue({
        rawText: "This is not JSON at all",
      });

      await expect(buildFrameScanUIReport(sampleRawResult, sampleScore, sampleContext))
        .rejects.toThrow("Failed to parse FrameScanUIReport JSON");
    });

    it("throws when required sections are missing", async () => {
      const incompleteReport = {
        ...mockUIReport,
        sections: [{ id: "summary", title: "Summary" }],
      };

      vi.mocked(openaiClient.callOpenAIChat).mockResolvedValue({
        rawText: JSON.stringify(incompleteReport),
      });

      await expect(buildFrameScanUIReport(sampleRawResult, sampleScore, sampleContext))
        .rejects.toThrow("must include section");
    });
  });

  describe("buildFallbackUIReport", () => {
    it("returns a valid FrameScanUIReport without LLM call", () => {
      const result = buildFallbackUIReport(sampleRawResult, sampleScore, sampleContext);

      expect(result).toBeDefined();
      expect(result.header).toBeDefined();
      expect(result.sections).toBeDefined();
    });

    it("includes all required sections", () => {
      const result = buildFallbackUIReport(sampleRawResult, sampleScore, sampleContext);

      const sectionIds = result.sections.map(s => s.id);
      expect(sectionIds).toContain("summary");
      expect(sectionIds).toContain("strengths");
      expect(sectionIds).toContain("weaknesses");
      expect(sectionIds).toContain("corrections");
    });

    it("uses the provided score in the header", () => {
      const result = buildFallbackUIReport(sampleRawResult, sampleScore, sampleContext);

      expect(result.header.highlightScore).toBe(sampleScore.frameScore);
    });

    it("includes badges based on frame state", () => {
      const result = buildFallbackUIReport(sampleRawResult, sampleScore, sampleContext);

      expect(result.header.badges.length).toBeGreaterThan(0);
    });

    it("extracts strengths from positive axis scores", () => {
      const result = buildFallbackUIReport(sampleRawResult, sampleScore, sampleContext);

      const strengthsSection = result.sections.find(s => s.id === "strengths");
      expect(strengthsSection).toBeDefined();
      expect(strengthsSection?.bullets?.length).toBeGreaterThan(0);
    });

    it("extracts weaknesses from negative axis scores", () => {
      const result = buildFallbackUIReport(sampleRawResult, sampleScore, sampleContext);

      const weaknessesSection = result.sections.find(s => s.id === "weaknesses");
      expect(weaknessesSection).toBeDefined();
      // There's one negative score in our sample data
      expect(weaknessesSection?.bullets?.length).toBeGreaterThan(0);
    });
  });

  describe("buildFrameScanUIReportSafe", () => {
    it("returns LLM result when call succeeds", async () => {
      vi.mocked(openaiClient.callOpenAIChat).mockResolvedValue({
        rawText: JSON.stringify(mockUIReport),
      });

      const result = await buildFrameScanUIReportSafe(sampleRawResult, sampleScore, sampleContext);

      expect(result.header.title).toBe(mockUIReport.header.title);
    });

    it("returns fallback result when LLM call fails", async () => {
      vi.mocked(openaiClient.callOpenAIChat).mockRejectedValue(new Error("API error"));

      const result = await buildFrameScanUIReportSafe(sampleRawResult, sampleScore, sampleContext);

      // Should still return a valid report
      expect(result).toBeDefined();
      expect(result.header).toBeDefined();
      expect(result.sections).toBeDefined();
      
      // Fallback uses subject label as title
      expect(result.header.title).toBe(sampleContext.subjectLabel);
    });

    it("returns fallback result when LLM returns invalid JSON", async () => {
      vi.mocked(openaiClient.callOpenAIChat).mockResolvedValue({
        rawText: "Not valid JSON",
      });

      const result = await buildFrameScanUIReportSafe(sampleRawResult, sampleScore, sampleContext);

      expect(result).toBeDefined();
      expect(result.header.highlightScore).toBe(sampleScore.frameScore);
    });
  });

  describe("UI Schema validation", () => {
    it("validates header structure", async () => {
      const invalidReport = {
        header: {
          title: "Test",
          // Missing other required fields
        },
        sections: mockUIReport.sections,
      };

      vi.mocked(openaiClient.callOpenAIChat).mockResolvedValue({
        rawText: JSON.stringify(invalidReport),
      });

      await expect(buildFrameScanUIReport(sampleRawResult, sampleScore, sampleContext))
        .rejects.toThrow();
    });

    it("validates sections is an array", async () => {
      const invalidReport = {
        header: mockUIReport.header,
        sections: "not an array",
      };

      vi.mocked(openaiClient.callOpenAIChat).mockResolvedValue({
        rawText: JSON.stringify(invalidReport),
      });

      await expect(buildFrameScanUIReport(sampleRawResult, sampleScore, sampleContext))
        .rejects.toThrow("must have a sections array");
    });
  });
});







