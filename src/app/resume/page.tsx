import type { Metadata } from "next";
import Image from "next/image";
import { SOCIAL_ICONS } from "../components/Icons";
import { TiltCard } from "../components/TiltCard";
import { Typer } from "../components/Typer";
import { ACHIEVEMENTS, EDUCATION, EXPERIENCE, ROLES, SKILL_GROUPS, SKILLS, SOCIALS, YEARS_EXPERIENCE } from "../data/site";

export const metadata: Metadata = {
  title: "Resume · Ekaphat Seamthong",
  description: "Ekaphat (Earth) Seamthong — QA Engineer at Fastwork with 4+ years in software testing.",
};

export default function ResumePage() {
  const socials = SOCIALS.filter((s) => s.href);

  return (
    <main className="page">
      <section className="hero">
        <TiltCard className="hero__photo">
          <Image src="/earth-profile-2026.jpg" alt="Ekaphat Seamthong" width={260} height={390} priority />
          <span className="badge-pass mono">✓ PASS</span>
        </TiltCard>

        <div className="hero__text">
          <p className="eyebrow mono">
            <span className="pulse" aria-hidden /> QA Engineer · Fastwork
          </p>
          <h1 className="hero__name">
            Ekaphat <span className="accent">Seamthong</span>
          </h1>
          <p className="hero__role">
            <Typer phrases={ROLES} />
          </p>
          <p className="hero__lead">
            QA engineer with {YEARS_EXPERIENCE}+ years of experience testing mobile and web products, now at Fastwork. I build
            test automation, keep CI/CD pipelines honest, and work closely with developers, product managers and designers.
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
        <div className="toolbelt">
          {SKILL_GROUPS.map((g) => (
            <div key={g.label} className="toolbelt__row">
              <span className="mono muted">{g.label}</span>
              <ul>
                {g.items.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="exp" aria-labelledby="exp-title">
        <div className="report__head">
          <h2 id="exp-title">Experience</h2>
          <span className="mono muted">{YEARS_EXPERIENCE}+ years in QA</span>
        </div>
        <ol className="exp__list">
          {EXPERIENCE.map((j) => (
            <li key={j.company} className={j.current ? "is-current" : undefined}>
              <span className="exp__dot" aria-hidden />
              <div className="exp__head">
                <h3>{j.company}</h3>
                <span className="mono exp__period">{j.period}</span>
              </div>
              <p className="exp__role">{j.role}</p>
              <ul className="exp__points">
                {j.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="edu" aria-label="Education and achievements">
        <div className="edu__card">
          <span className="mono muted">Education</span>
          <h3>{EDUCATION.school}</h3>
          <p className="muted">{EDUCATION.detail}</p>
        </div>
        <div className="edu__card">
          <span className="mono muted">Achievements</span>
          <ul>
            {ACHIEVEMENTS.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
