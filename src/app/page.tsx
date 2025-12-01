import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 font-sans px-4">
      <main className="flex flex-col items-center max-w-3xl w-full py-20 px-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg sm:flex-row sm:gap-20">
        {/* Profile Image */}
        <div className="flex-shrink-0">
          <Image
            className="rounded-full border-4 border-zinc-200 dark:border-zinc-700"
            src="/EarthProfile.jpg"
            alt="Ekaphat Seamthong"
            width={180}
            height={180}
            priority
          />
        </div>

        {/* Text Content */}
        <div className="mt-8 sm:mt-0 flex flex-col gap-6 text-center sm:text-left">
          <h1 className="text-4xl font-bold text-black dark:text-zinc-50">
            Ekaphat Seamthong
          </h1>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              className="px-6 py-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
              href="https://www.linkedin.com/in/ekaphat/"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
            <a
              className="px-6 py-3 rounded-full border border-zinc-400 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition font-semibold"
              href="https://github.com/earthekaphat"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
          <p className="text-zinc-700 dark:text-zinc-300 text-lg leading-relaxed">
            Experienced Software Development Engineer in Test with 3+ years of experience,
            leading testing operations for multiple mobile and web products. Skilled in automated
            and manual testing, CI/CD pipelines, and cross-functional collaboration.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/about"
              className="px-6 py-3 rounded-full border border-zinc-400 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition font-semibold"
            >
              About Me
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
