import type { Metadata } from "next";
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
        <h1>Guess the Number</h1>
        <p className="muted">Two players, one phone. When it is time to pick a secret number, the app tells you who to pass the phone to and hides the screen.</p>
      </header>
      <NumberDuel />
    </main>
  );
}
