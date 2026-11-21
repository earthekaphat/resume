"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LangSwitch, useLang } from "../i18n";

const LINKS = [
  { href: "/resume", en: "Resume", th: "เรซูเม่" },
  { href: "/game", en: "Game", th: "เกม" },
  { href: "/map", en: "Map", th: "แผนที่" },
  { href: "/random", en: "Random", th: "สุ่ม" },
  { href: "/trips", en: "Trips", th: "ทริป" },
];

export function SiteHeader() {
  const path = usePathname();
  const { t } = useLang();
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand" aria-label={t("Home", "หน้าแรก")}>
          <span className="brand__dot" aria-hidden />
          <span>
            earth<span className="brand__dim">.ekp</span>
          </span>
        </Link>
        <LangSwitch />
        <nav aria-label="Main">
          {LINKS.map((l) => {
            const active = path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} className="nav-link" aria-current={active ? "page" : undefined}>
                {t(l.en, l.th)}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
