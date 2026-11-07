"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/random", label: "Random" },
  { href: "/trips", label: "Trips" },
];

export function SiteHeader() {
  const path = usePathname();
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand" aria-label="Home">
          <span className="brand__dot" aria-hidden />
          <span>
            earth<span className="brand__dim">.ekp</span>
          </span>
        </Link>
        <nav aria-label="Main">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} className="nav-link" aria-current={active ? "page" : undefined}>
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
