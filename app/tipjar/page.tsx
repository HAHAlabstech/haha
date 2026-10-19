import { redirect } from "next/navigation";

export default function TipJarRedirectPage() {
  redirect("/app?tab=tipjar");
}
