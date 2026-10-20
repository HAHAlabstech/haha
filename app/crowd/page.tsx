import { redirect } from "next/navigation";
import { buildRedirectUrl, SearchParamsPromise } from "@/lib/redirects";

export default async function CrowdRedirectPage(props: {
  searchParams?: SearchParamsPromise;
}) {
  const dest = await buildRedirectUrl("crowd", props.searchParams);
  redirect(dest);
}
