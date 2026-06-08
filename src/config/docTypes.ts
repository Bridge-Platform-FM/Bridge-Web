/**
 * Document-type identifiers sent to the scan API (`docType`) so the backend knows
 * which document each uploaded file represents. Aadhaar additionally carries a
 * `side` (front/back). Keep these strings in sync with the backend's expected values.
 */
export const DOC_TYPE = {
  AADHAAR: "AADHAAR",
  PAN: "PAN",
  PITCH_DECK: "PITCH_DECK",
  INCORPORATION_CERTIFICATE: "INCORPORATION_CERTIFICATE",
} as const;

export type DocType = (typeof DOC_TYPE)[keyof typeof DOC_TYPE];

/** Which face of a two-sided document (Aadhaar) is being uploaded. */
export type DocSide = "front" | "back";
