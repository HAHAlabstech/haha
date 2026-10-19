import { redirect } from "next/navigation";

export default function CrowdRedirectPage() {
  redirect("/app?tab=crowd");
}
