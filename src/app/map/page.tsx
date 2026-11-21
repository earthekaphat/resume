import type { Metadata } from "next";
import { T } from "../i18n";
import { TravelMap } from "../components/TravelMap";

export const metadata: Metadata = {
  title: "Travel map · Ekaphat",
  description: "Pick the countries you have been to, see them on a world map and download it as an image.",
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
            en="Tap countries on the map or pick them from the list. Your picks are saved on this device. Download the map as an image when you’re done."
            th="แตะประเทศบนแผนที่หรือเลือกจากรายการ ประเทศที่เลือกจะถูกจำไว้ในเครื่องนี้ เสร็จแล้วดาวน์โหลดแผนที่เป็นรูปได้"
          />
        </p>
      </header>
      <TravelMap />
    </main>
  );
}
