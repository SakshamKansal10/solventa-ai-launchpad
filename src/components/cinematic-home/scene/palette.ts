/**
 * Brand colours as plain hex for WebGL materials — three.js cannot read CSS
 * custom properties. Values mirror the sol-* tokens in src/styles.css; the
 * stage background is a deeper midnight than sol-navy so the core can read.
 */
export const PALETTE = {
  midnight: "#060A16",
  navy: "#18213D", // --sol-navy
  pearl: "#FCFAF7", // --sol-pearl
  champagne: "#C3A064", // --sol-champagne
  violet: "#7058D7", // --sol-violet
} as const;
