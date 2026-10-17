import { describe, expect, it } from "vitest";

import { modelKindOf } from "./model";

describe("modelKindOf", () => {
  it("lets the title decide when it names the model", () => {
    expect(
      modelKindOf("Niche Digital Product: Templates for Freelancers", "storefront tools"),
    ).toBe("product");
    expect(modelKindOf("Paid Newsletter for Local Job Seekers")).toBe("content");
    expect(modelKindOf("Spoken English Tutoring for Kids")).toBe("education");
    expect(modelKindOf("Workshop Booking Platform")).toBe("marketplace");
    expect(modelKindOf("Home Bakery for Office Orders")).toBe("physical");
  });

  it("keeps a service a service, whatever its description mentions", () => {
    expect(
      modelKindOf(
        "Freelance Website Builds for Local Businesses",
        "Websites for local shops. Fixed-price template websites, basic tools.",
      ),
    ).toBe("service");
  });

  it("matches whole words only, then falls back to a service", () => {
    expect(modelKindOf("Local growth help", "storefront setup for sellers")).toBe("service");
    expect(modelKindOf("Weekend help", "a small grocery store")).toBe("physical");
  });
});
