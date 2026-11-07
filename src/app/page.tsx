import Image from "next/image";
import Link from "next/link";
import { ArrowIcon, SOCIAL_ICONS } from "./components/Icons";
import { TiltCard } from "./components/TiltCard";
import { Typer } from "./components/Typer";
import { ROLES, SKILLS, SOCIALS } from "./data/site";
import { TRIPS } from "./data/trips";

export default function Home() {
  const socials = SOCIALS.filter((s) => s.href);

  return (
    <main className="page">
      <section className="hero">
        <TiltCard className="hero__photo">
          <Image src="/EarthProfile.jpg" alt="Ekaphat Seamthong" width={260} height={260} priority />
          <span className="badge-pass mono">✓ PASS</span>
        </TiltCard>

        <div className="hero__text">
          <p className="eyebrow mono">
            <span className="pulse" aria-hidden /> QA · automation · CI/CD
          </p>
          <h1 className="hero__name">
            Ekaphat <span className="accent">Seamthong</span>
          </h1>
          <p className="hero__role">
            <Typer phrases={ROLES} />
          </p>
          <p className="hero__lead">
            SDET with 3+ years of experience leading testing for mobile and web products. I build test automation,
            keep CI/CD pipelines honest, and work closely with product and engineering teams.
          </p>

          <ul className="socials" aria-label="Social links">
            {socials.map((s) => {
              const Icon = SOCIAL_ICONS[s.key];
              return (
                <li key={s.key}>
                  <a className={`social social--${s.key}`} href={s.href} target="_blank" rel="noopener noreferrer">
                    <Icon />
                    <span>
                      <b>{s.label}</b>
                      {s.handle && <small className="mono">@{s.handle}</small>}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="report" aria-labelledby="skills-title">
        <div className="report__head">
          <h2 id="skills-title">Skills</h2>
          <span className="mono muted">{SKILLS.length} passed · 0 failed</span>
        </div>
        <ul className="report__list">
          {SKILLS.map((s, i) => (
            <li key={s} style={{ animationDelay: `${i * 70}ms` }}>
              <span className="tick mono" aria-hidden>
                ✓
              </span>
              {s}
            </li>
          ))}
        </ul>
      </section>

      <section className="tiles" aria-label="Tools">
        <Link href="/random" className="tile tile--random">
          <span className="tile__kicker mono">tool</span>
          <h2>Random picker</h2>
          <p>Add up to 10 choices, shuffle the cards and flip one.</p>
          <span className="tile__deck" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="tile__go">
            Open <ArrowIcon />
          </span>
        </Link>

        <Link href="/trips" className="tile tile--trips">
          <span className="tile__kicker mono">travel</span>
          <h2>Trip plans</h2>
          <p>
            Ready: {TRIPS.filter((t) => t.href).map((t) => t.city).join(", ") || "none yet"}.
            {TRIPS.some((t) => !t.href) && <> Coming soon: {TRIPS.filter((t) => !t.href).map((t) => t.city).join(", ")}.</>}
          </p>
          <span className="tile__stamp mono" aria-hidden>
            {TRIPS[0]?.city.toUpperCase()}
          </span>
          <span className="tile__go">
            Open <ArrowIcon />
          </span>
        </Link>
      </section>
    </main>
  );
}
