/** Render a 6-decimal USDG base-unit balance as a rounded two-decimal label. */
export function formatUsdgMicroDisplay(microUsdG: string): string {
  if (!/^\d+$/.test(microUsdG)) return "—";
  const micro = BigInt(microUsdG);
  const cents = (micro + 5_000n) / 10_000n;
  const whole = cents / 100n;
  const fractional = (cents % 100n).toString().padStart(2, "0");
  return `${whole.toLocaleString("en-US")}.${fractional}`;
}
