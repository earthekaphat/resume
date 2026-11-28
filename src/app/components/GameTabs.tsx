"use client";

import { useEffect, useState } from "react";
import { useLang } from "../i18n";
import { HeadAsk } from "./HeadAsk";
import { HeadGuess } from "./HeadGuess";
import { NumberDuel } from "./NumberDuel";

type Tab = "duo" | "party";
type Party = "ask" | "rush";
const STORE = "earth-game-tab";

// /game: two-player games in one tab, games for a group in the other.
export function GameTabs() {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("duo");
  const [party, setParty] = useState<Party | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(STORE);
      } catch {}
      const pick = [location.hash.slice(1), saved].find((x) => x === "duo" || x === "party");
      if (pick) setTab(pick as Tab);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  function choose(id: Tab) {
    setTab(id);
    setParty(null);
    try {
      localStorage.setItem(STORE, id);
      history.replaceState(null, "", `#${id}`);
    } catch {}
  }

  return (
    <div className="gametabs">
      <div className="maptabs__bar gametabs__bar" role="tablist" aria-label={t("Game type", "ประเภทเกม")}>
        <button type="button" role="tab" aria-selected={tab === "duo"} className={tab === "duo" ? "is-on" : undefined} onClick={() => choose("duo")}>
          <span aria-hidden>👥</span> {t("2 players", "2 คน")}
        </button>
        <button type="button" role="tab" aria-selected={tab === "party"} className={tab === "party" ? "is-on" : undefined} onClick={() => choose("party")}>
          <span aria-hidden>🎉</span> {t("Multiplayer", "หลายคน")}
        </button>
      </div>

      {tab === "duo" && <NumberDuel />}
      {tab === "party" && party === "ask" && <HeadAsk onExit={() => setParty(null)} />}
      {tab === "party" && party === "rush" && <HeadGuess onExit={() => setParty(null)} />}
      {tab === "party" && !party && (
        <div className="game">
          <div className="modes">
            <button type="button" className="mode-card mode-card--head mode-card--ask" onClick={() => setParty("ask")}>
              <span className="tile__kicker mono">{t("2–10 players · new", "2–10 คน · ใหม่")}</span>
              <b>{t("What am I?", "บนหัวฉันคืออะไร?")}</b>
              <span className="muted">{t("Everyone gets one word on their head. Take turns asking one yes/no question. First to guess their own word wins.", "ทุกคนมีคำบนหัวคนละคำ ผลัดกันถามทีละคำถาม ใช่/ไม่ใช่ ใครทายคำตัวเองได้ก่อนชนะ")}</span>
              <span className="mode-art mono" aria-hidden>
                <i>🙋</i>
                <i>❓</i>
                <i>👑</i>
              </span>
            </button>
            <button type="button" className="mode-card mode-card--head" onClick={() => setParty("rush")}>
              <span className="tile__kicker mono">{t("2–10 players · timed", "2–10 คน · จับเวลา")}</span>
              <b>{t("Head Rush", "ทายไวบนหัว")}</b>
              <span className="muted">{t("Phone on your forehead, friends shout clues, guess as many words as you can before time runs out.", "แปะมือถือบนหน้าผาก เพื่อนรุมใบ้ ทายให้ได้มากที่สุดก่อนหมดเวลา")}</span>
              <span className="mode-art mono" aria-hidden>
                <i>🤳</i>
                <i>⏱️</i>
                <i>🧀</i>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
