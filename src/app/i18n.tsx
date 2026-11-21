"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "th";

const STORE = "earth-lang";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (en: string, th: string) => string };

const LangContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (en) => en });

// English is what the server renders; a saved Thai choice is applied after the first paint.
export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        if (localStorage.getItem(STORE) === "th") setLangState("th");
      } catch {}
    }, 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORE, l);
    } catch {}
  }, []);

  const value = useMemo<Ctx>(() => ({ lang, setLang, t: (en, th) => (lang === "th" ? th : en) }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

// For server components: <T en="Hello" th="สวัสดี" />
export function T({ en, th }: { en: string; th: string }) {
  const { lang } = useLang();
  return <>{lang === "th" ? th : en}</>;
}

export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-switch" role="radiogroup" aria-label="Language">
      {(["en", "th"] as const).map((l) => (
        <button key={l} type="button" role="radio" aria-checked={lang === l} className={lang === l ? "is-on" : undefined} onClick={() => setLang(l)}>
          {l === "en" ? "EN" : "TH"}
        </button>
      ))}
    </div>
  );
}
