import type { Metadata } from "next";
import { T } from "../i18n";
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
        <h1>
          <T en="Shuffle and pick" th="สับไพ่ เลือกให้" />
        </h1>
        <p className="muted">
          <T
            en="Add up to 10 choices and shuffle. One card flips over with the answer. Your list is saved on this device."
            th="ใส่ตัวเลือกได้สูงสุด 10 อัน กดสับไพ่ แล้วไพ่ใบหนึ่งจะพลิกขึ้นมาเป็นคำตอบ รายการจะถูกจำไว้ในเครื่องนี้"
          />
        </p>
      </header>
      <CardDraw />
    </main>
  );
}
