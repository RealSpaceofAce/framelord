// =============================================================================
// FRAMELORD ASSISTANT TESTS — Tests for per-contact Framelord assistant
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  runFramelordForContact,
  createInitialFramelordMessage,
  type FramelordMessage,
  type FramelordResponse,
} from "./framelordAssistant";
import * as openaiClient from "../llm/openaiClient";
import * as contactStore from "../../services/contactStore";
import * as frameScanReportStore from "../../services/frameScanReportStore";
import * as contactContextStore from "../../services/contactContextStore";

// Mock dependencies
vi.mock("../llm/openaiClient", () => ({
  callOpenAIChat: vi.fn(),
}));

vi.mock("../../services/contactStore", () => ({
  getContactById: vi.fn(),
  CONTACT_ZERO: { id: "contact_zero", fullName: "Grimson" },
}));

vi.mock("../../services/frameScanReportStore", () => ({
  getReportsForContact: vi.fn(),
}));

vi.mock("../../services/contactContextStore", () => ({
  getContactContextSummary: vi.fn(),
  upsertContactContextSummary: vi.fn(),
}));

describe("framelordAssistant", () => {
  const mockContact = {
    id: "test-contact-123",
    fullName: "John Doe",
    relationshipRole: "prospect",
    relationshipDomain: "business",
    company: "Acme Corp",
    title: "CEO",
  };

  const mockReports = [
    {
      id: "report-1",
      createdAt: "2025-01-01T00:00:00Z",
      score: {
        frameScore: 75,
        overallFrame: "apex",
      },
      domain: "sales_email",
    },
  ];

  const mockContextSummary = {
    contactId: "test-contact-123",
    lastUpdatedAt: "2025-01-01T00:00:00Z",
    summary: "Business prospect with strong frame dynamics.",
  };

  const mockFramelordResponse: FramelordResponse = {
    reply: "Based on your recent scans, John shows strong apex signals in sales communications.",
    updatedSummary: "Strong business prospect. Frame shows buyer positioning.",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(contactStore.getContactById).mockReturnValue(mockContact as any);
    vi.mocked(frameScanReportStore.getReportsForContact).mockReturnValue(mockReports as any);
    vi.mocked(contactContextStore.getContactContextSummary).mockReturnValue(mockContextSummary);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("runFramelordForContact", () => {
    it("returns parsed FramelordResponse when LLM returns valid JSON", async () => {
      vi.mocked(openaiClient.callOpenAIChat).mockResolvedValue({
        rawText: JSON.stringify(mockFramelordResponse),
      });

      const messages: FramelordMessage[] = [
        { role: "user", content: "What patterns do you see with John?" },
      ];

      const result = await runFramelordForContact("test-contact-123", messages);

      expect(result).toBeDefined();
      expect(result.reply).toBe(mockFramelordResponse.reply);
      expect(result.updatedSummary).toBe(mockFramelordResponse.updatedSummary);
    });

    it("calls upsertContactContextSummary when updatedSummary is provided", async () => {
      vi.mocked(openaiClient.callOpenAIChat).mockResolvedValue({
        rawText: JSON.stringify(mockFramelordResponse),
      });

      const messages: FramelordMessage[] = [
        { role: "user", content: "Analyze the frame with John" },
      ];

      await runFramelordForContact("test-contact-123", messages);

      expect(contactContextStore.upsertContactContextSummary).toHaveBeenCalledWith(
        "test-contact-123",
        mockFramelordResponse.updatedSummary
      );
    });

    it("does not call upsertContactContextSummary when updatedSummary is empty", async () => {
      const responseWithoutSummary: FramelordResponse = {
        reply: "Here is my analysis...",
      };

      vi.mocked(openaiClient.callOpenAIChat).mockResolvedValue({
        rawText: JSON.stringify(responseWithoutSummary),
      });

      const messages: FramelordMessage[] = [
        { role: "user", content: "Tell me about the frame" },
      ];

      await runFramelordForContact("test-contact-123", messages);

      expect(contactContextStore.upsertContactContextSummary).not.toHaveBeenCalled();
    });

    it("parses JSON embedded in other text", async () => {
      vi.mocked(openaiClient.callOpenAIChat).mockResolvedValue({
        rawText: `Here is my response:\n${JSON.stringify(mockFramelordResponse)}\n\nDone.`,
      });

      const messages: FramelordMessage[] = [
        { role: "user", content: "Analyze" },
      ];

      const result = await runFramelordForContact("test-contact-123", messages);

      expect(result.reply).toBe(mockFramelordResponse.reply);
    });

    it("returns fallback response when JSON parsing fails completely", async () => {
      vi.mocked(openaiClient.callOpenAIChat).mockResolvedValue({
        rawText: "Just some plain text without JSON",
      });

      const messages: FramelordMessage[] = [
        { role: "user", content: "Test" },
      ];

      const result = await runFramelordForContact("test-contact-123", messages);

      // Should treat the response as the reply
      expect(result.reply).toBe("Just some plain text without JSON");
    });

    it("returns error message when contact is not found", async () => {
      vi.mocked(contactStore.getContactById).mockReturnValue(undefined);

      const messages: FramelordMessage[] = [
        { role: "user", content: "Test" },
      ];

      const result = await runFramelordForContact("nonexistent-contact", messages);

      expect(result.reply).toContain("couldn't find information");
    });

    it("passes contact info to the LLM payload", async () => {
      vi.mocked(openaiClient.callOpenAIChat).mockResolvedValue({
        rawText: JSON.stringify(mockFramelordResponse),
      });

      const messages: FramelordMessage[] = [
        { role: "user", content: "Analyze" },
      ];

      await runFramelordForContact("test-contact-123", messages);

      expect(openaiClient.callOpenAIChat).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(openaiClient.callOpenAIChat).mock.calls[0][0];
      
      // User message should contain JSON with contact info
      const userMessage = callArgs.find(m => m.role === "user");
      expect(userMessage).toBeDefined();
      const payload = JSON.parse(userMessage!.content);
      expect(payload.contact.name).toBe("John Doe");
      expect(payload.contact.role).toBe("prospect");
    });

    it("includes recent reports in payload", async () => {
      vi.mocked(openaiClient.callOpenAIChat).mockResolvedValue({
        rawText: JSON.stringify(mockFramelordResponse),
      });

      const messages: FramelordMessage[] = [
        { role: "user", content: "Analyze" },
      ];

      await runFramelordForContact("test-contact-123", messages);

      const callArgs = vi.mocked(openaiClient.callOpenAIChat).mock.calls[0][0];
      const userMessage = callArgs.find(m => m.role === "user");
      const payload = JSON.parse(userMessage!.content);
      
      expect(payload.recentReports).toBeDefined();
      expect(payload.recentReports.length).toBeGreaterThan(0);
      expect(payload.recentReports[0].frameScore).toBe(75);
    });

    it("includes context summary when available", async () => {
      vi.mocked(openaiClient.callOpenAIChat).mockResolvedValue({
        rawText: JSON.stringify(mockFramelordResponse),
      });

      const messages: FramelordMessage[] = [
        { role: "user", content: "Analyze" },
      ];

      await runFramelordForContact("test-contact-123", messages);

      const callArgs = vi.mocked(openaiClient.callOpenAIChat).mock.calls[0][0];
      const userMessage = callArgs.find(m => m.role === "user");
      const payload = JSON.parse(userMessage!.content);
      
      expect(payload.contextSummary).toBeDefined();
      expect(payload.contextSummary.summary).toBe(mockContextSummary.summary);
    });

    it("handles null context summary", async () => {
      vi.mocked(contactContextStore.getContactContextSummary).mockReturnValue(null);
      vi.mocked(openaiClient.callOpenAIChat).mockResolvedValue({
        rawText: JSON.stringify(mockFramelordResponse),
      });

      const messages: FramelordMessage[] = [
        { role: "user", content: "Analyze" },
      ];

      const result = await runFramelordForContact("test-contact-123", messages);

      expect(result.reply).toBe(mockFramelordResponse.reply);
    });
  });

  describe("createInitialFramelordMessage", () => {
    it("returns assistant message for regular contact", () => {
      const message = createInitialFramelordMessage("test-contact-123");

      expect(message.role).toBe("assistant");
      expect(message.content).toContain("John Doe");
    });

    it("returns self-analysis message for Contact Zero", () => {
      const message = createInitialFramelordMessage("contact_zero");

      expect(message.role).toBe("assistant");
      expect(message.content).toContain("your own frame");
    });

    it("handles unknown contact gracefully", () => {
      vi.mocked(contactStore.getContactById).mockReturnValue(undefined);

      const message = createInitialFramelordMessage("unknown-contact");

      expect(message.role).toBe("assistant");
      expect(message.content).toContain("this contact");
    });
  });
});




