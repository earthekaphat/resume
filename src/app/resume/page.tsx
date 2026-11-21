import type { Metadata } from "next";
import Image from "next/image";
import { SOCIAL_ICONS } from "../components/Icons";
import { TiltCard } from "../components/TiltCard";
import { Typer } from "../components/Typer";
import { ACHIEVEMENTS, ACHIEVEMENTS_TH, EDUCATION, EXPERIENCE, ROLES, ROLES_TH, SKILL_GROUPS, SKILLS, SKILLS_TH, SOCIALS, YEARS_EXPERIENCE } from "../data/site";
import { T } from "../i18n";

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
            <Typer phrases={ROLES} phrasesTh={ROLES_TH} />
          </p>
          <p className="hero__lead">
            <T
              en={`QA engineer with ${YEARS_EXPERIENCE}+ years of experience testing mobile and web products, now at Fastwork. I build test automation, keep CI/CD pipelines honest, and work closely with developers, product managers and designers.`}
              th={`QA engineer ประสบการณ์ ${YEARS_EXPERIENCE}+ ปี ทดสอบแอปมือถือและเว็บ ตอนนี้อยู่ที่ Fastwork ชอบสร้าง test automation ดูแล CI/CD pipeline ให้เชื่อถือได้ และทำงานใกล้ชิดกับ developer, product manager และ designer`}
            />
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
          <h2 id="skills-title">
            <T en="Skills" th="ทักษะ" />
          </h2>
          <span className="mono muted">
            <T en={`${SKILLS.length} passed · 0 failed`} th={`ผ่าน ${SKILLS.length} · ไม่ผ่าน 0`} />
          </span>
        </div>
        <ul className="report__list">
          {SKILLS.map((s, i) => (
            <li key={s} style={{ animationDelay: `${i * 70}ms` }}>
              <span className="tick mono" aria-hidden>
                ✓
              </span>
              <T en={s} th={SKILLS_TH[i] ?? s} />
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
          <h2 id="exp-title">
            <T en="Experience" th="ประสบการณ์ทำงาน" />
          </h2>
          <span className="mono muted">
            <T en={`${YEARS_EXPERIENCE}+ years in QA`} th={`ทำ QA มา ${YEARS_EXPERIENCE}+ ปี`} />
          </span>
        </div>
        <ol className="exp__list">
          {EXPERIENCE.map((j) => (
            <li key={j.company} className={j.current ? "is-current" : undefined}>
              <span className="exp__dot" aria-hidden />
              <div className="exp__head">
                <h3>{j.company}</h3>
                <span className="mono exp__period">
                  <T en={j.period} th={j.periodTh ?? j.period} />
                </span>
              </div>
              <p className="exp__role">
                <T en={j.role} th={j.roleTh ?? j.role} />
              </p>
              <ul className="exp__points">
                {j.points.map((pt, k) => (
                  <li key={pt}>
                    <T en={pt} th={j.pointsTh[k] ?? pt} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="edu" aria-label="Education and achievements">
        <div className="edu__card">
          <span className="mono muted">
            <T en="Education" th="การศึกษา" />
          </span>
          <h3>
            <T en={EDUCATION.school} th={EDUCATION.schoolTh} />
          </h3>
          <p className="muted">
            <T en={EDUCATION.detail} th={EDUCATION.detailTh} />
          </p>
        </div>
        <div className="edu__card">
          <span className="mono muted">
            <T en="Achievements" th="ผลงาน" />
          </span>
          <ul>
            {ACHIEVEMENTS.map((a, k) => (
              <li key={a}>
                <T en={a} th={ACHIEVEMENTS_TH[k] ?? a} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
