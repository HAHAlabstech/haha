import { redirect } from "next/navigation";
import { buildRedirectUrl, SearchParamsPromise } from "@/lib/redirects";

export default async function SeasonsPage(props: {
  searchParams?: SearchParamsPromise;
}) {
  const dest = await buildRedirectUrl("leaderboard", props.searchParams);
  redirect(dest);
}
