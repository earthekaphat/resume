import type { Metadata } from "next";
import { T } from "../i18n";
import { MapTabs } from "../components/MapTabs";

export const metadata: Metadata = {
  title: "Travel map · Ekaphat",
  description: "Mark countries and Thai provinces you have been to, or put trips on a calendar, and download them as images.",
};

export default function MapPage() {
  return (
    <main className="page">
      <header className="page-head">
        <p className="eyebrow mono">tool · travel map</p>
        <h1>
          <T en="Where have you been?" th="เคยไปประเทศไหนมาแล้วบ้าง?" />
        </h1>
        <p className="muted">
          <T
            en="Mark the countries or Thai provinces you’ve been to, or put your trips on a calendar. Everything is saved on this device, and each one downloads as an image."
            th="เลือกประเทศหรือจังหวัดในไทยที่เคยไป หรือใส่ทริปลงปฏิทิน ข้อมูลจะถูกจำไว้ในเครื่องนี้ และดาวน์โหลดเป็นรูปได้ทุกแบบ"
          />
        </p>
      </header>
      <MapTabs />
    </main>
  );
}
