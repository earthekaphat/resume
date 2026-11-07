import type { Metadata } from "next";
import Image from "next/image";
import { ArrowIcon } from "../components/Icons";
import { TRIPS } from "../data/trips";

export const metadata: Metadata = {
  title: "Trip plans · Ekaphat",
  description: "Day-by-day travel plans with maps, transport and places to eat.",
};

export default function TripsPage() {
  return (
    <main className="page">
      <header className="page-head">
        <p className="eyebrow mono">travel · {TRIPS.length} plan{TRIPS.length === 1 ? "" : "s"}</p>
        <h1>Trip plans</h1>
        <p className="muted">แพลนเที่ยวแบบรายวัน มีแผนที่ เวลา การเดินทาง และร้านที่ต้องแวะ เปิดบนมือถือได้</p>
      </header>

      <ul className="trips">
        {TRIPS.map((t) => {
          const body = (
            <>
              {t.cover && (
                <span className="trip__cover">
                  <Image src={t.cover.src} alt={`${t.city} cover`} fill sizes="(max-width: 700px) 100vw, 50vw" />
                </span>
              )}
              <span className="trip__body">
                <span className="trip__meta mono">
                  {t.country} · {t.days} days
                </span>
                <span className="trip__city">{t.city}</span>
                <span className="trip__dates mono">{t.dates}</span>
                <span className="trip__summary">{t.summary}</span>
                <span className="trip__tags">
                  {t.highlights.map((h) => (
                    <span key={h}>{h}</span>
                  ))}
                </span>
                {t.href ? (
                  <span className="tile__go">
                    Open plan <ArrowIcon />
                  </span>
                ) : (
                  <span className="trip__soon mono">Coming soon</span>
                )}
              </span>
            </>
          );
          return (
            <li key={t.slug}>
              {t.href ? (
                <a className="trip" href={t.href}>
                  {body}
                </a>
              ) : (
                <div className={`trip trip--upcoming trip--${t.slug}`}>{body}</div>
              )}
              {t.sheet && (
                <a className="trip__sheet mono" href={t.sheet} target="_blank" rel="noopener noreferrer">
                  Google Sheet ↗
                </a>
              )}
            </li>
          );
        })}
      </ul>

      <p className="credit mono muted">
        Cover photos:{" "}
        {TRIPS.filter((t) => t.cover).map((t, i) => (
          <span key={t.slug}>
            {i > 0 && ", "}
            <a href={t.cover!.creditHref} target="_blank" rel="noopener noreferrer">
              {t.city} — {t.cover!.credit}
            </a>
          </span>
        ))}
      </p>
    </main>
  );
}
