export type SearchParamsPromise = Promise<{ [key: string]: string | string[] | undefined }>;

export async function buildRedirectUrl(
  tab: string,
  searchParamsPromise?: SearchParamsPromise
): Promise<string> {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (searchParamsPromise) {
    try {
      const sp = await searchParamsPromise;
      if (sp && typeof sp === "object") {
        for (const [key, value] of Object.entries(sp)) {
          if (key !== "tab") {
            if (Array.isArray(value)) {
              for (const v of value) {
                params.append(key, v.toLowerCase());
              }
            } else if (typeof value === "string") {
              params.set(key, value.toLowerCase());
            }
          }
        }
      }
    } catch {
      // In case searchParams is undefined or not a promise
    }
  }
  return `/app?${params.toString()}`;
}
