import type { Metadata } from "next";
import { T } from "../i18n";
import { NumberDuel } from "../components/NumberDuel";

export const metadata: Metadata = {
  title: "Guess the Number · Ekaphat",
  description: "Two-player number guessing games on one phone: secret digit duel and number bomb.",
};

export default function GamePage() {
  return (
    <main className="page">
      <header className="page-head">
        <p className="eyebrow mono">game · 2 players · 1 phone</p>
        <h1>
          <T en="Guess the Number" th="เกมหาคนแพ้" />
        </h1>
        <p className="muted">
          <T en="Two players, one phone. When it is time to pick a secret number, the app tells you who to pass the phone to and hides the screen." th="เล่นสองคนด้วยมือถือเครื่องเดียว ตอนต้องแอบเลือกเลข แอปจะบอกว่าต้องส่งเครื่องให้ใคร และซ่อนจอให้" />
        </p>
      </header>
      <NumberDuel />
    </main>
  );
}
