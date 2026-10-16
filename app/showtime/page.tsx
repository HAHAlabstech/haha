import type { Metadata } from "next";
import ShowtimeExperience from "@/components/ShowtimeExperience";

export const metadata: Metadata = {
  title: "Showtime 360° Orbit — HAHA",
  description:
    "Interactive 360° WebGL scroll experience around the bronze Straight Man statue. Tell a joke, fool the AI, get paid, and build the Joke Vault.",
};

export default function ShowtimePage() {
  return <ShowtimeExperience />;
}
