import type { Metadata } from "next";
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
        <h1>Where have you been?</h1>
        <p className="muted">
          Tap countries on the map or pick them from the list. Your picks are saved on this device. Download the map as an image when you’re done.
        </p>
      </header>
      <TravelMap />
    </main>
  );
}
