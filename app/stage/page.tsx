import { redirect } from "next/navigation";
import { buildRedirectUrl, SearchParamsPromise } from "@/lib/redirects";

export default async function StageRedirectPage(props: {
  searchParams?: SearchParamsPromise;
}) {
  const dest = await buildRedirectUrl("stage", props.searchParams);
  redirect(dest);
}
