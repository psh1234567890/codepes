import {
  Binary,
  Blocks,
  Braces,
  Gamepad2,
  ShieldCheck,
} from "lucide-react";
import type { CompetitionType } from "../types/competition";

export function TypeIcon({ type }: { type: CompetitionType }) {
  switch (type) {
    case "ps":
      return <Braces aria-hidden="true" />;
    case "hackathon":
      return <Blocks aria-hidden="true" />;
    case "ai-data":
      return <Binary aria-hidden="true" />;
    case "game":
      return <Gamepad2 aria-hidden="true" />;
    case "security":
      return <ShieldCheck aria-hidden="true" />;
  }
}
