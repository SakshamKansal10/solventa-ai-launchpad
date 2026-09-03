import { describe, it, expect } from "vitest";
import { sanitizeOtpInput, isOtpLengthPlausible, OTP_MIN_LENGTH, OTP_MAX_LENGTH } from "@/lib/otp";

describe("otp helpers", () => {
  it("sanitizeOtpInput strips whitespace but never assumes a character set", () => {
    expect(sanitizeOtpInput("123 456")).toBe("123456");
    expect(sanitizeOtpInput("  ab12cd34  ")).toBe("ab12cd34");
    expect(sanitizeOtpInput("AB12-CD34")).toBe("AB12-CD34");
  });

  it("accepts every length in Supabase's documented valid range (6-10), not just 6", () => {
    for (let len = OTP_MIN_LENGTH; len <= OTP_MAX_LENGTH; len++) {
      expect(isOtpLengthPlausible("1".repeat(len))).toBe(true);
    }
  });

  it("rejects a code shorter than the documented floor and longer than the ceiling", () => {
    expect(isOtpLengthPlausible("12345")).toBe(false);
    expect(isOtpLengthPlausible("12345678901")).toBe(false);
  });

  it("accepts an 8-character code — the exact real-world case that motivated this fix", () => {
    expect(isOtpLengthPlausible("A1B2C3D4")).toBe(true);
  });
});
