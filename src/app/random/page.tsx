import type { Metadata } from "next";
import { CardDraw } from "../components/CardDraw";

export const metadata: Metadata = {
  title: "Random picker · Ekaphat",
  description: "Add up to 10 choices, shuffle the cards and flip one.",
};

export default function RandomPage() {
  return (
    <main className="page">
      <header className="page-head">
        <p className="eyebrow mono">tool · random picker</p>
        <h1>Shuffle and pick</h1>
        <p className="muted">
          Add up to 10 choices and shuffle. One card flips over with the answer. Your list is saved on this device.
        </p>
      </header>
      <CardDraw />
    </main>
  );
}
