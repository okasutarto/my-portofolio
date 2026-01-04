import jubliaLogo from "@/assets/jublia.jpg";
import nullrebornLogo from "@/assets/nullreborn.jpg";
import geekseatLogo from "@/assets/geekseat.png";

export const experiences = [
  {
    id: 1,
    role: "Frontend Engineer",
    company: "Jublia",
    companyInitial: "J",
    logo: jubliaLogo,
    companyUrl: "https://www.jublia.com/",
    location: "Singapore (Remote)",
    period: "Jul 2023 - Dec 2025",
    current: false,
    type: "Full-time",
    color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    description:
      "Lead frontend development for a global B2B SaaS event networking platform, ensuring high performance for major international conferences.",
    achievements: [
      "Improved user engagement by 40% through enhanced UI/UX performance",
      "Maintained 95%+ code coverage with scalable frontend architecture",
      "Expanded to Angular projects beyond core Vue.js responsibilities",
      "Mentored junior developers on coding best practices",
    ],
    technologies: [
      "Vue.js",
      "Angular",
      "TypeScript",
      "Vuex",
      "Bootstrap 5",
      "Unlayer",
    ],
  },
  {
    id: 2,
    role: "Backend Developer",
    company: "Null Reborn",
    companyInitial: "NR",
    logo: nullrebornLogo,
    companyUrl: "https://www.linkedin.com/company/null-reborn",
    location: "Indonesia (Remote)",
    period: "Mar 2023 - Jul 2023",
    current: false,
    type: "Part-time",
    color: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    description:
      "Architected and implemented secure RESTful APIs for applications, achieving 99.9% uptime and robust security compliance.",
    achievements: [
      "Reduced database query response times by 60% through optimization",
      "Built authentication systems with role-based access control (RBAC)",
      "Achieved 99.9% API uptime through efficient architecture",
      "Collaborated with frontend teams for seamless API integration",
    ],
    technologies: [
      "Node.js",
      "Express",
      "PostgreSQL",
      "MySQL",
      "Sequelize",
      "JWT",
    ],
  },
  {
    id: 3,
    role: "Junior Frontend Developer",
    company: "PT Geekseat Indonesia",
    companyInitial: "GS",
    logo: geekseatLogo,
    companyUrl: "https://geekseat.com.au/",
    location: "Bandung, Indonesia",
    period: "Sep 2022 - Jun 2023",
    current: false,
    type: "Full-time",
    color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    description:
      "Developed responsive web applications and built user interfaces with modern frontend frameworks in an Agile environment.",
    achievements: [
      "Built responsive UIs with React and Vue.js",
      "Integrated APIs and real-time data features",
      "Collaborated closely with UI/UX design teams",
      "Practiced Scrum and Agile development methodologies",
    ],
    technologies: [
      "React",
      "Vue.js",
      "Tailwind CSS",
      "Kendo UI",
      "HTML",
      "CSS",
    ],
  },
];
