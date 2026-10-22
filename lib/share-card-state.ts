const FINAL_STATUSES = new Set(["killed_it", "bombed", "heckled_off"]);

/** Only expose a share-card URL after a Crowd outcome exists and upload completed. */
export function shareCardUrlForBit(input: {
  status: string;
  hasOutcome: boolean;
  storedUrl?: string | null;
}): string | null {
  if (!FINAL_STATUSES.has(input.status) || !input.hasOutcome) return null;
  return input.storedUrl || null;
}
