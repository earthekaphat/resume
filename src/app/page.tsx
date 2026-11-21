import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "./components/Icons";
import { TRIPS } from "./data/trips";

export default function Home() {
  const ready = TRIPS.filter((t) => t.href).map((t) => t.city);
  const soon = TRIPS.filter((t) => !t.href).map((t) => t.city);

  return (
    <main className="page">
      <header className="page-head hub-head">
        <p className="eyebrow mono">
          <span className="pulse" aria-hidden /> earth.ekp
        </p>
        <h1>What do you want to do today?</h1>
        <p className="muted">Pick one: my resume, a travel map, a random picker, trip plans, or two-player games.</p>
      </header>

      <section className="tiles hub" aria-label="Pages">
        <Link href="/resume" className="tile tile--resume">
          <span className="tile__kicker mono">resume</span>
          <h2>Ekaphat Seamthong</h2>
          <p>QA Engineer at Fastwork · experience, skills and how to reach me</p>
          <span className="tile__avatar" aria-hidden>
            <Image src="/earth-profile-2026.jpg" alt="" width={84} height={126} />
          </span>
          <span className="tile__go">
            Open <ArrowIcon />
          </span>
        </Link>

        <Link href="/game" className="tile tile--game">
          <span className="tile__kicker mono">game · 2 players</span>
          <h2>Guess the Number</h2>
          <p>Four quick games to find the loser: Mind Duel, Number Bomb, Stop at 10.00 and Reaction Duel. One phone, two players.</p>
          <span className="tile__digits mono" aria-hidden>
            {[3, "?", 7].map((d, i) => (
              <i key={i}>{d}</i>
            ))}
          </span>
          <span className="tile__go">
            Play <ArrowIcon />
          </span>
        </Link>

        <Link href="/map" className="tile tile--map">
          <span className="tile__kicker mono">tool · new</span>
          <h2>Travel map</h2>
          <p>Pick the countries you’ve been to, see them on a world map and download it.</p>
          <span className="tile__globe" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="tile__go">
            Open <ArrowIcon />
          </span>
        </Link>

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
            Ready: {ready.join(", ") || "none yet"}.{soon.length > 0 && <> Coming soon: {soon.join(", ")}.</>}
          </p>
          <span className="tile__stamp mono" aria-hidden>
            {ready[0]?.toUpperCase()}
          </span>
          <span className="tile__go">
            Open <ArrowIcon />
          </span>
        </Link>
      </section>
    </main>
  );
}
