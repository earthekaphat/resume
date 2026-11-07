export type Trip = {
  slug: string;
  city: string;
  country: string;
  dates: string;
  days: number;
  summary: string;
  // Static plan page in /public, or leave empty while the trip is still being planned.
  href: string;
  // Optional spreadsheet version of the plan in /public.
  sheet?: string;
  cover?: { src: string; credit: string; creditHref: string };
  highlights: string[];
};

// Add a new trip here. Put its plan page in /public and its cover photo in /public/trips.
export const TRIPS: Trip[] = [
  {
    slug: "shanghai",
    city: "Shanghai",
    country: "China",
    dates: "2–7 Dec 2026",
    days: 6,
    summary: "Disneyland, the Bund at night, French Concession streets and a day at Haichang Ocean Park.",
    href: "/shanghai.html",
    sheet: "/shanghai-schedule.xlsx",
    cover: {
      src: "/trips/shanghai.jpg",
      credit: "Ernest Jourdier · CC BY 4.0",
      creditHref: "https://commons.wikimedia.org/wiki/File:Bund_at_night_Shanghai.jpg",
    },
    highlights: ["Disneyland", "The Bund", "Wukang Road", "Xintiandi", "Haichang"],
  },
  {
    slug: "malapascua",
    city: "Malapascua",
    country: "Philippines",
    dates: "29 Apr – 6 May 2027",
    days: 8,
    summary: "Scuba diving trip: early-morning thresher shark dives and small island reefs.",
    href: "",
    highlights: ["Scuba diving", "Monad Shoal", "Thresher sharks", "Gato Island", "Kimud Shoal"],
  },
];
