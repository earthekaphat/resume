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
  "Mobile (Android & iOS) & web QA",
  "API testing",
  "Performance testing",
  "CI/CD pipelines",
  "Release management",
  "Agile & Scrum",
];

export const ROLES = [
  "QA Engineer at Fastwork",
  "Software Development Engineer in Test",
  "Test automation builder",
  "Trip planner on weekends",
];

export const SKILLS_TH = [
  "Test automation",
  "Manual testing",
  "ทดสอบแอปมือถือ (Android & iOS) และเว็บ",
  "ทดสอบ API",
  "Performance testing",
  "CI/CD pipelines",
  "ดูแลการ release",
  "Agile & Scrum",
];

export const ROLES_TH = ["QA Engineer ที่ Fastwork", "Software Development Engineer in Test", "สาย test automation", "วันหยุดเป็นนักวางแพลนเที่ยว"];

export const YEARS_EXPERIENCE = 4;

export const SKILL_GROUPS: { label: string; items: string[] }[] = [
  { label: "Languages", items: ["JavaScript", "TypeScript", "Node.js", "Java", "Go"] },
  { label: "Testing", items: ["Playwright", "Cypress", "Selenium", "Jest", "Robot Framework", "K6"] },
  { label: "Data", items: ["PostgreSQL", "MongoDB", "SQL", "Redis"] },
  {
    label: "Tools",
    items: ["Jira", "Confluence", "GitHub", "GitLab", "Jenkins", "Kubernetes", "OpenSearch", "Splunk", "Firebase", "Postman", "Bruno"],
  },
];

export type Job = { company: string; role: string; period: string; current?: boolean; points: string[]; roleTh?: string; periodTh?: string; pointsTh: string[] };

// Fill in the Fastwork start month and highlights when ready.
export const EXPERIENCE: Job[] = [
  {
    company: "Fastwork",
    role: "Quality Assurance Engineer",
    period: "Present",
    periodTh: "ปัจจุบัน",
    current: true,
    points: ["Quality assurance for Fastwork's web and mobile products."],
    pointsTh: ["ดูแลคุณภาพของเว็บและแอปมือถือของ Fastwork"],
  },
  {
    company: "ATA IT Limited",
    role: "Quality Assurance Engineer",
    period: "Jun 2025",
    points: [
      "Built automated tests for a web-based trading platform.",
      "Planned test scenarios and test runs with the team in Canada.",
      "Set up a new Selenium automation framework and its Jenkins integration.",
      "Tracked defects with developers through to release.",
    ],
    periodTh: "มิ.ย. 2025",
    pointsTh: [
      "เขียน automated test ให้แพลตฟอร์มเทรดบนเว็บ",
      "วาง test scenario และรอบการทดสอบร่วมกับทีมที่แคนาดา",
      "วาง Selenium automation framework ใหม่และเชื่อมกับ Jenkins",
      "ติดตาม defect กับทีม dev จนถึงวัน release",
    ],
  },
  {
    company: "LINE MAN Wongnai",
    role: "Software Development Engineer in Test",
    period: "Jun 2022 – Jun 2025",
    points: [
      "Automated tests for payment and order statistics services, backend and frontend.",
      "Built \"QA Tool\", an internal API tool for test automation, in Go, JavaScript and TypeScript.",
      "Led integration testing for the joint LINE MAN × LINE Pay payment solution.",
      "Ran performance tests with scenarios based on baseline traffic data.",
      "Release manager for sprint deployments and on-call support for production issues.",
    ],
    periodTh: "มิ.ย. 2022 – มิ.ย. 2025",
    pointsTh: [
      "เขียน automated test ให้ระบบ payment และ order statistics ทั้งฝั่ง backend และ frontend",
      "สร้าง \"QA Tool\" เครื่องมือ API ภายในสำหรับ test automation ด้วย Go, JavaScript และ TypeScript",
      "นำการทดสอบ integration ของระบบชำระเงินร่วม LINE MAN × LINE Pay",
      "ทำ performance test โดยออกแบบ scenario จากข้อมูล traffic จริง",
      "เป็น release manager ของแต่ละ sprint และ on-call ดูแลปัญหาบน production",
    ],
  },
  {
    company: "Ajinomoto Co., (Thailand) Ltd.",
    role: "RPA Developer (Trainee)",
    roleTh: "RPA Developer (ฝึกงาน)",
    period: "Jun 2021 – Jul 2021",
    periodTh: "มิ.ย. 2021 – ก.ค. 2021",
    points: ["Automated accounting data entry into SAP with UiPath."],
    pointsTh: ["ทำระบบกรอกข้อมูลบัญชีเข้า SAP อัตโนมัติด้วย UiPath"],
  },
];

export const EDUCATION = {
  school: "Faculty of ICT, Mahidol University",
  detail: "Software Engineering track · GPA 3.50",
  schoolTh: "คณะเทคโนโลยีสารสนเทศและการสื่อสาร มหาวิทยาลัยมหิดล",
  detailTh: "สาขา Software Engineering · เกรดเฉลี่ย 3.50",
};

export const ACHIEVEMENTS = [
  "4-year Ajinomoto Talent Scholarship",
  "Finalist, Inno for Change 2020 and 2021",
  "Represented Mahidol University at Startup Thailand League 2021",
];

export const ACHIEVEMENTS_TH = [
  "ทุน Ajinomoto Talent Scholarship 4 ปี",
  "เข้ารอบสุดท้าย Inno for Change 2020 และ 2021",
  "ตัวแทนมหาวิทยาลัยมหิดลใน Startup Thailand League 2021",
];
