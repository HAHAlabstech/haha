import { redirect } from "next/navigation";

export default function SeasonsPage() {
  redirect("/app?tab=leaderboard");
}
