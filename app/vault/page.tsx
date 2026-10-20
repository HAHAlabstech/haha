import { redirect } from "next/navigation";
import { buildRedirectUrl, SearchParamsPromise } from "@/lib/redirects";

export default async function VaultRedirectPage(props: {
  searchParams?: SearchParamsPromise;
}) {
  const dest = await buildRedirectUrl("vault", props.searchParams);
  redirect(dest);
}
