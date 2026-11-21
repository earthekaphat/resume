import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "./components/Icons";
import { TRIPS } from "./data/trips";
import { T } from "./i18n";

export default function Home() {
  const ready = TRIPS.filter((t) => t.href).map((t) => t.city);
  const soon = TRIPS.filter((t) => !t.href).map((t) => t.city);

  return (
    <main className="page">
      <header className="page-head hub-head">
        <p className="eyebrow mono">
          <span className="pulse" aria-hidden /> earth.ekp
        </p>
        <h1>
          <T en="What do you want to do today?" th="วันนี้อยากทำอะไรดี?" />
        </h1>
        <p className="muted">
          <T en="Pick one: my resume, a travel map, a random picker, trip plans, or two-player games." th="เลือกได้เลย มีเรซูเม่ แผนที่ประเทศที่เคยไป เครื่องมือสุ่ม แพลนเที่ยว และเกมเล่นสองคน" />
        </p>
      </header>

      <section className="tiles hub" aria-label="Pages">
        <Link href="/resume" className="tile tile--resume">
          <span className="tile__kicker mono">resume</span>
          <h2>Ekaphat Seamthong</h2>
          <p>
            <T en="QA Engineer at Fastwork · experience, skills and how to reach me" th="QA Engineer ที่ Fastwork · ประสบการณ์ ทักษะ และช่องทางติดต่อ" />
          </p>
          <span className="tile__avatar" aria-hidden>
            <Image src="/earth-profile-2026.jpg" alt="" width={84} height={126} />
          </span>
          <span className="tile__go">
            <T en="Open" th="เปิด" /> <ArrowIcon />
          </span>
        </Link>

        <Link href="/game" className="tile tile--game">
          <span className="tile__kicker mono">game · 2 players</span>
          <h2>
            <T en="Guess the Number" th="เกมหาคนแพ้" />
          </h2>
          <p>
            <T en="Four quick games to find the loser: Mind Duel, Number Bomb, Stop at 10.00 and Reaction Duel. One phone, two players." th="4 เกมสั้น ๆ ไว้หาคนแพ้: ทายใจ เลขระเบิด หยุดเวลา 10.00 และดวลความไว เล่นสองคนด้วยมือถือเครื่องเดียว" />
          </p>
          <span className="tile__digits mono" aria-hidden>
            {[3, "?", 7].map((d, i) => (
              <i key={i}>{d}</i>
            ))}
          </span>
          <span className="tile__go">
            <T en="Play" th="เล่น" /> <ArrowIcon />
          </span>
        </Link>

        <Link href="/map" className="tile tile--map">
          <span className="tile__kicker mono">tool · new</span>
          <h2>
            <T en="Travel map" th="แผนที่ประเทศที่เคยไป" />
          </h2>
          <p>
            <T en="Countries, Thai provinces and a trip calendar. Mark where you’ve been and download it." th="แผนที่โลก จังหวัดในไทย และปฏิทินทริป เลือกที่เคยไปแล้วดาวน์โหลดเป็นรูปได้" />
          </p>
          <span className="tile__globe" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="tile__go">
            <T en="Open" th="เปิด" /> <ArrowIcon />
          </span>
        </Link>

        <Link href="/random" className="tile tile--random">
          <span className="tile__kicker mono">tool</span>
          <h2>
            <T en="Random picker" th="สุ่มให้เลือก" />
          </h2>
          <p>
            <T en="Add up to 10 choices, shuffle the cards and flip one." th="ใส่ตัวเลือกได้ถึง 10 อัน สับไพ่แล้วพลิกขึ้นมาหนึ่งใบ" />
          </p>
          <span className="tile__deck" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="tile__go">
            <T en="Open" th="เปิด" /> <ArrowIcon />
          </span>
        </Link>

        <Link href="/trips" className="tile tile--trips">
          <span className="tile__kicker mono">travel</span>
          <h2>
            <T en="Trip plans" th="แพลนเที่ยว" />
          </h2>
          <p>
            <T
              en={`Ready: ${ready.join(", ") || "none yet"}.${soon.length ? ` Coming soon: ${soon.join(", ")}.` : ""}`}
              th={`พร้อมแล้ว: ${ready.join(", ") || "ยังไม่มี"}${soon.length ? ` · เร็ว ๆ นี้: ${soon.join(", ")}` : ""}`}
            />
          </p>
          <span className="tile__stamp mono" aria-hidden>
            {ready[0]?.toUpperCase()}
          </span>
          <span className="tile__go">
            <T en="Open" th="เปิด" /> <ArrowIcon />
          </span>
        </Link>
      </section>
    </main>
  );
}
