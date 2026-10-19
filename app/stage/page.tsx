import { redirect } from "next/navigation";

export default function StageRedirectPage() {
  redirect("/app?tab=stage");
}
