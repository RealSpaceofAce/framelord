import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { callNanoBananaAnnotateImage, isNanoBananaAvailable } from "./nanobananaClient";
import * as providers from "./providers";

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock the resolveApiKey function
vi.mock("./providers", () => ({
  resolveApiKey: vi.fn(),
}));

describe("nanobananaClient", () => {
  const originalFetch = global.fetch;
  const mockResolveApiKey = providers.resolveApiKey as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ===========================================================================
  // MOCK MODE TESTS (no API key)
  // ===========================================================================

  describe("when API key is not configured", () => {
    beforeEach(() => {
      mockResolveApiKey.mockReturnValue(null);
    });

    it("returns a mock NanoBananaResult with at least one annotation", async () => {
      const result = await callNanoBananaAnnotateImage("https://example.com/image.jpg");

      expect(result).toBeDefined();
      expect(result.annotations).toBeDefined();
      expect(Array.isArray(result.annotations)).toBe(true);
      expect(result.annotations.length).toBeGreaterThanOrEqual(1);
    });

    it("mock annotations have valid FrameImageAnnotation shape", async () => {
      const result = await callNanoBananaAnnotateImage("https://example.com/image.jpg");

      const annotation = result.annotations[0];
      expect(typeof annotation.id).toBe("string");
      expect(typeof annotation.label).toBe("string");
      expect(typeof annotation.description).toBe("string");
      expect(["info", "warning", "critical"]).toContain(annotation.severity);
      expect(typeof annotation.x).toBe("number");
      expect(typeof annotation.y).toBe("number");
      expect(typeof annotation.width).toBe("number");
      expect(typeof annotation.height).toBe("number");
    });

    it("isNanoBananaAvailable returns false", () => {
      expect(isNanoBananaAvailable()).toBe(false);
    });
  });

  // ===========================================================================
  // REAL API MODE TESTS (with API key)
  // ===========================================================================

  describe("when API key is configured", () => {
    beforeEach(() => {
      mockResolveApiKey.mockReturnValue("test-api-key-123");
    });

    it("isNanoBananaAvailable returns true", () => {
      expect(isNanoBananaAvailable()).toBe(true);
    });

    it("maps a valid API response to NanoBananaResult", async () => {
      const mockResponse = {
        annotations: [
          {
            id: "ann-1",
            label: "posture_issue",
            description: "Subject leaning inward",
            severity: "warning",
            x: 0.2,
            y: 0.3,
            width: 0.4,
            height: 0.5,
          },
          {
            id: "ann-2",
            label: "good_framing",
            description: "Subject centered in frame",
            severity: "info",
            x: 0.1,
            y: 0.1,
            width: 0.8,
            height: 0.8,
          },
        ],
        annotatedImageUrl: "https://cdn.nanobanana.example.com/annotated/abc123.png",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await callNanoBananaAnnotateImage("https://example.com/image.jpg");

      expect(result.annotations).toHaveLength(2);
      expect(result.annotatedImageUrl).toBe("https://cdn.nanobanana.example.com/annotated/abc123.png");

      // Verify first annotation mapping
      expect(result.annotations[0]).toEqual({
        id: "ann-1",
        label: "posture_issue",
        description: "Subject leaning inward",
        severity: "warning",
        x: 0.2,
        y: 0.3,
        width: 0.4,
        height: 0.5,
      });
    });

    it("applies fallback values for missing annotation fields", async () => {
      const mockResponse = {
        annotations: [
          {
            // Missing id, label, description, severity
            x: 0.5,
            y: 0.5,
            width: 0.2,
            height: 0.2,
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await callNanoBananaAnnotateImage("https://example.com/image.jpg");

      expect(result.annotations).toHaveLength(1);
      expect(result.annotations[0].id).toBe("nb-0"); // index-based fallback
      expect(result.annotations[0].label).toBe("region"); // fallback
      expect(result.annotations[0].description).toBe("region"); // fallback to label
      expect(result.annotations[0].severity).toBe("info"); // default
    });

    it("clamps coordinates to [0, 1] range", async () => {
      const mockResponse = {
        annotations: [
          {
            id: "out-of-bounds",
            label: "test",
            description: "test",
            severity: "info",
            x: -0.5, // should clamp to 0
            y: 1.5, // should clamp to 1
            width: 2.0, // should clamp to 1
            height: -0.1, // should clamp to 0
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await callNanoBananaAnnotateImage("https://example.com/image.jpg");

      expect(result.annotations[0].x).toBe(0);
      expect(result.annotations[0].y).toBe(1);
      expect(result.annotations[0].width).toBe(1);
      expect(result.annotations[0].height).toBe(0);
    });

    it("skips annotations with invalid bounding box coordinates", async () => {
      const mockResponse = {
        annotations: [
          {
            id: "valid",
            label: "test",
            x: 0.5,
            y: 0.5,
            width: 0.2,
            height: 0.2,
          },
          {
            id: "invalid",
            label: "test",
            x: "not a number", // invalid
            y: 0.5,
            width: 0.2,
            height: 0.2,
          },
          {
            id: "missing",
            label: "test",
            // missing x, y, width, height
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await callNanoBananaAnnotateImage("https://example.com/image.jpg");

      // Only the valid annotation should be included
      expect(result.annotations).toHaveLength(1);
      expect(result.annotations[0].id).toBe("valid");
    });

    it("throws on non-OK HTTP response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: () => Promise.resolve("Invalid API key"),
      } as unknown as Response);

      await expect(
        callNanoBananaAnnotateImage("https://example.com/image.jpg")
      ).rejects.toThrow("[NanoBanana] API error: 403 Forbidden");
    });

    it("throws on network error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

      await expect(
        callNanoBananaAnnotateImage("https://example.com/image.jpg")
      ).rejects.toThrow("[NanoBanana] Network error");
    });

    it("sends correct request structure", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ annotations: [] }),
      } as Response);

      await callNanoBananaAnnotateImage("https://example.com/my-image.jpg");

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];

      expect(url).toContain("/v1/annotate");
      expect(options.method).toBe("POST");
      expect(options.headers["content-type"]).toBe("application/json");
      expect(options.headers.authorization).toBe("Bearer test-api-key-123");

      const body = JSON.parse(options.body);
      expect(body.imageUrl).toBe("https://example.com/my-image.jpg");
      expect(body.options.returnAnnotatedImage).toBe(true);
    });
  });
});




