import { describe, it, expect } from "vitest";
import {
  getOtpSendErrorMessage,
  getOtpVerifyErrorMessage,
  getPasswordSignInErrorMessage,
} from "@/lib/auth-error-messages";

describe("auth-error-messages", () => {
  it("getOtpSendErrorMessage: rate limit vs generic", () => {
    expect(getOtpSendErrorMessage({ status: 429 })).toBe(
      "Too many attempts. Please wait before trying again.",
    );
    expect(getOtpSendErrorMessage({ message: "rate limit exceeded" })).toBe(
      "Too many attempts. Please wait before trying again.",
    );
    expect(getOtpSendErrorMessage(new TypeError("fetch failed"))).toBe(
      "Could not send code. Please try again.",
    );
    expect(getOtpSendErrorMessage(undefined)).toBe("Could not send code. Please try again.");
  });

  it("getOtpVerifyErrorMessage: rate limit vs generic invalid/expired", () => {
    expect(getOtpVerifyErrorMessage({ status: 429 })).toBe(
      "Too many attempts. Please wait before trying again.",
    );
    expect(getOtpVerifyErrorMessage({ message: "Token has expired or is invalid" })).toBe(
      "That code is incorrect or has expired.",
    );
  });

  it("getPasswordSignInErrorMessage: rate limit vs invalid credentials", () => {
    expect(getPasswordSignInErrorMessage({ status: 429 })).toBe(
      "Too many attempts. Please wait before trying again.",
    );
    expect(getPasswordSignInErrorMessage({ message: "Invalid login credentials" })).toBe(
      "Invalid email or password.",
    );
  });

  it("never throws on odd inputs", () => {
    expect(() => getOtpSendErrorMessage(null)).not.toThrow();
    expect(() => getOtpVerifyErrorMessage("a string")).not.toThrow();
    expect(() => getPasswordSignInErrorMessage(42)).not.toThrow();
  });
});
