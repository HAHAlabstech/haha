export interface ClipboardWriter {
  writeText: (text: string) => Promise<void>;
}

/** Copy helper kept separate so clipboard permission failures are testable. */
export async function copyContractAddress(
  address: string,
  clipboard: ClipboardWriter | undefined,
): Promise<boolean> {
  if (!clipboard) return false;
  try {
    await clipboard.writeText(address);
    return true;
  } catch {
    return false;
  }
}
