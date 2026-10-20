import { redirect } from "next/navigation";
import { buildRedirectUrl, SearchParamsPromise } from "@/lib/redirects";

export default async function TipJarRedirectPage(props: {
  searchParams?: SearchParamsPromise;
}) {
  const dest = await buildRedirectUrl("tipjar", props.searchParams);
  redirect(dest);
}
