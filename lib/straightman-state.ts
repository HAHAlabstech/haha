/** True only while the backend can still produce a Straight Man answer. */
export function shouldAnimateStraightMan(
  status: string | null | undefined,
  hasAnswer: boolean,
): boolean {
  return status === "screening" || (status === "answered" && !hasAnswer);
}
