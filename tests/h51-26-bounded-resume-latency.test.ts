import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { boundedProviderFetch } from "@/lib/recruiting/recruiting-ai-deadline";

describe("H51.26 bounded recruiting latency", () => {
  it("aborts a provider request at the total deadline", async () => {
    const fetcher = vi.fn((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined;
        signal?.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
      }),
    );

    await expect(
      boundedProviderFetch("https://example.invalid", {}, {
        timeoutMs: 20,
        maxAttempts: 2,
        isRetryable: () => true,
        retryDelayMs: () => 0,
        statusError: () => new Error("status"),
        timeoutError: () => new Error("deadline"),
        networkError: () => new Error("network"),
        fetcher: fetcher as unknown as typeof fetch,
      }),
    ).rejects.toThrow("deadline");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("keeps retries bounded and can recover once", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const response = await boundedProviderFetch("https://example.invalid", {}, {
      timeoutMs: 2_000,
      maxAttempts: 2,
      isRetryable: (r) => r.status >= 500,
      retryDelayMs: () => 0,
      statusError: () => new Error("status"),
      timeoutError: () => new Error("deadline"),
      networkError: () => new Error("network"),
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("keeps pass 3 text-only and preserves fail-closed assurance", () => {
    const provider = fs.readFileSync("src/lib/recruiting/ats-provider.ts", "utf8");
    const service = fs.readFileSync("src/lib/recruiting/ats-service.ts", "utf8");
    const intelligence = fs.readFileSync("src/lib/recruiting/resume-document-intelligence.ts", "utf8");
    const hosting = fs.readFileSync("apphosting.yaml", "utf8");

    expect(provider).toContain("RECRUITING_RESUME_PARSE_V8_BOUNDED_LATENCY");
    expect(provider).toContain("maxAttempts:2");
    expect(provider).toContain("ai_provider_timeout");
    expect(provider).toContain("aiJson(profile,pass1Prompt,attachment,pass1TimeoutMs)");
    expect(provider).toContain("aiJson(profile,verifyPrompt,attachment,pass2TimeoutMs)");
    expect(provider).toContain("aiJson(profile,semanticPrompt,undefined,pass3TimeoutMs)");
    expect(provider).toContain("sourceEvidence||aiEvidenceText");
    expect(service).toContain("applyResumeAssurance(profile");
    expect(service).toContain("!coverage.prefillReady");
    expect(intelligence).toContain("OPSIQO_RECRUITING_DOCUMENT_AI_TIMEOUT_MS");
    expect(intelligence).toContain("NATIVE_AUTHORITY_SCORE = 88");
    expect(hosting).toContain("OPSIQO_RECRUITING_AI_PASS1_TIMEOUT_MS");
    expect(hosting).toContain("OPSIQO_RECRUITING_AI_PASS2_TIMEOUT_MS");
    expect(hosting).toContain("OPSIQO_RECRUITING_AI_PASS3_TIMEOUT_MS");
  });
});
