"use client";

import { useEffect, useState } from "react";
import { useLang } from "../i18n";
import { FriendGate } from "./FriendGate";
import { PhotoDump } from "./PhotoDump";
import { TravelCalendar } from "./TravelCalendar";
import { TravelMap } from "./TravelMap";

type Tab = "world" | "thailand" | "calendar" | "dump";
const TABS: { id: Tab; en: string; th: string; icon: string }[] = [
  { id: "world", en: "World", th: "โลก", icon: "🌍" },
  { id: "thailand", en: "Thailand", th: "ประเทศไทย", icon: "🇹🇭" },
  { id: "calendar", en: "Calendar", th: "ปฏิทิน", icon: "📅" },
  { id: "dump", en: "Photo dump", th: "Photo dump", icon: "📸" },
];
const STORE = "earth-map-tab";

export function MapTabs() {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("world");

  // Open the tab named in the link (#thailand, #calendar) or the last one used here.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const fromHash = location.hash.slice(1);
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(STORE);
      } catch {}
      const pick = TABS.find((x) => x.id === fromHash) ?? TABS.find((x) => x.id === saved);
      if (pick) setTab(pick.id);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  function choose(id: Tab) {
    setTab(id);
    try {
      localStorage.setItem(STORE, id);
      history.replaceState(null, "", `#${id}`);
    } catch {}
  }

  return (
    <div className="maptabs">
      <div className="maptabs__bar" role="tablist" aria-label={t("Map type", "ประเภทแผนที่")}>
        {TABS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className={tab === x.id ? "is-on" : undefined} onClick={() => choose(x.id)}>
            <span aria-hidden>{x.icon}</span> {t(x.en, x.th)}
          </button>
        ))}
      </div>
      <FriendGate>
        {tab === "world" && <TravelMap key="world" kind="world" />}
        {tab === "thailand" && <TravelMap key="thailand" kind="thailand" />}
        {tab === "calendar" && <TravelCalendar />}
        {tab === "dump" && <PhotoDump />}
      </FriendGate>
    </div>
  );
}
