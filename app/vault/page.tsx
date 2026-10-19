import { redirect } from "next/navigation";

export default function VaultRedirectPage() {
  redirect("/app?tab=vault");
}
