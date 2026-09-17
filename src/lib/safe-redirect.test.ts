import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "@/lib/safe-redirect";

describe("sanitizeNextPath", () => {
  it("accepts an internal path with a query string", () => {
    expect(sanitizeNextPath("/dashboard?consultation=abc-123")).toBe(
      "/dashboard?consultation=abc-123",
    );
  });

  it("accepts an internal path with a hash", () => {
    expect(sanitizeNextPath("/dashboard/roadmap#week-2")).toBe("/dashboard/roadmap#week-2");
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeNextPath("//evil.com")).toBeNull();
  });

  it("rejects absolute URLs to other origins", () => {
    expect(sanitizeNextPath("https://evil.com")).toBeNull();
    expect(sanitizeNextPath("http://evil.com/x")).toBeNull();
  });

  it("rejects non-http(s) schemes", () => {
    expect(sanitizeNextPath("javascript:alert(1)")).toBeNull();
  });

  it("rejects whitespace/control-character smuggling toward another origin", () => {
    expect(sanitizeNextPath("/\t/evil.com")).toBeNull();
  });

  it("rejects empty, null, and undefined input", () => {
    expect(sanitizeNextPath("")).toBeNull();
    expect(sanitizeNextPath(null)).toBeNull();
    expect(sanitizeNextPath(undefined)).toBeNull();
  });

  it("rejects a path that doesn't start with a single leading slash", () => {
    expect(sanitizeNextPath("dashboard")).toBeNull();
  });
});
