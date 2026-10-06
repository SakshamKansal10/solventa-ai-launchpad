import { FINALS_HUB } from "../layout";

/** Direction 01 (left) and Direction 03 (right). Direction 02 — the one — is the nested arches. */
export const SIDE_FINALISTS = [
  {
    label: "Direction 01",
    centre: [FINALS_HUB[0] - 7.5, FINALS_HUB[1] + 0.8, FINALS_HUB[2] + 1] as const,
    form: "vane" as const,
  },
  {
    label: "Direction 03",
    centre: [FINALS_HUB[0] + 7.5, FINALS_HUB[1] - 1.1, FINALS_HUB[2] - 0.5] as const,
    form: "helix" as const,
  },
];
export const WINNER_LABEL = "Direction 02";
