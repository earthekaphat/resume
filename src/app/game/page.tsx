import type { Metadata } from "next";
import { T } from "../i18n";
import { NumberDuel } from "../components/NumberDuel";

export const metadata: Metadata = {
  title: "Games · Ekaphat",
  description: "Party and two-player games on one phone: What’s on my head?, Stop at 10.00, Reaction Duel, Mind Duel and Number Bomb.",
};

export default function GamePage() {
  return (
    <main className="page">
      <header className="page-head">
        <p className="eyebrow mono">games · 1 phone</p>
        <h1>
          <T en="Find the Loser" th="เกมหาคนแพ้" />
        </h1>
        <p className="muted">
          <T en="Party games on one phone. The app tells you whose turn it is and who to pass the phone to." th="เกมปาร์ตี้เล่นด้วยมือถือเครื่องเดียว แอปจะบอกว่าตาใครและต้องส่งเครื่องให้ใคร" />
        </p>
      </header>
      <NumberDuel />
    </main>
  );
}
