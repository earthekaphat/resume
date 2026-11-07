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
        <h1>สับไพ่ เลือกให้</h1>
        <p className="muted">
          ใส่ตัวเลือกได้สูงสุด 10 อัน กดสับไพ่ แล้วไพ่ใบหนึ่งจะพลิกขึ้นมาเป็นคำตอบ รายการจะจำไว้ในเครื่องนี้
        </p>
      </header>
      <CardDraw />
    </main>
  );
}
