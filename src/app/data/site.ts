export type SocialKey = "github" | "facebook" | "instagram" | "linkedin";

export type Social = {
  key: SocialKey;
  label: string;
  handle: string;
  href: string;
};

// Leave href empty to hide a link.
export const SOCIALS: Social[] = [
  { key: "github", label: "GitHub", handle: "earthekaphat", href: "https://github.com/earthekaphat" },
  { key: "facebook", label: "Facebook", handle: "", href: "" },
  { key: "instagram", label: "Instagram", handle: "earth_ekp", href: "https://www.instagram.com/earth_ekp/" },
  { key: "linkedin", label: "LinkedIn", handle: "ekaphat", href: "https://www.linkedin.com/in/ekaphat/" },
];

export const SKILLS = [
  "Test automation",
  "Manual testing",
  "Mobile & web QA",
  "CI/CD pipelines",
  "API testing",
  "Test strategy",
  "Cross-functional collaboration",
];

export const ROLES = [
  "Software Development Engineer in Test",
  "Test automation builder",
  "Bug hunter",
  "Trip planner on weekends",
];
