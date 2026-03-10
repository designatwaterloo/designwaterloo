import { createClient } from "@sanity/client";
import { readFileSync } from "fs";
import { resolve } from "path";
import https from "https";
import http from "http";

// Load env
const envContent = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^=]+)=["']?(.+?)["']?$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const client = createClient({
  projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-01-01",
  useCdn: false,
  token: env.SANITY_API_TOKEN,
});

function key(): string {
  return Math.random().toString(36).slice(2, 10);
}

function bioBlock(text: string): any[] {
  if (!text) return [];
  return [
    {
      _type: "block",
      _key: key(),
      style: "normal",
      markDefs: [],
      children: [{ _type: "span", _key: key(), text, marks: [] }],
    },
  ];
}

function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const get = url.startsWith("https") ? https.get : http.get;
    get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if ([301, 302, 303, 307].includes(res.statusCode!)) {
        return downloadBuffer(res.headers.location!).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function uploadDriveImage(driveUrl: string, name: string): Promise<any> {
  const idMatch = driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
  if (!idMatch) throw new Error(`Can't extract Drive file ID from: ${driveUrl}`);
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
  console.log(`    Downloading image...`);
  const buffer = await downloadBuffer(downloadUrl);
  console.log(`    Uploading image (${(buffer.length / 1024).toFixed(0)}KB)...`);
  const asset = await client.assets.upload("image", buffer, { filename: `${name}.jpg` });
  return {
    _type: "image",
    asset: { _type: "reference", _ref: asset._id },
  };
}

// ─── Organization mapping ───
// Maps org names used in CSV to existing Sanity organization document IDs.
// Orgs not in this map will be created as new organization documents.
const ORG_MAP: Record<string, string> = {
  "Figma": "f4c6df80-2b31-470d-9ef0-e63ea11a48c2",
  "Figma at Waterloo": "7WZciq5UK6HSJWlcfwVeDf",
  "UX Laurier": "f15765f9-7a95-4e7e-a9b6-b3481bc70b32",
  "Design Waterloo": "a1db5282-e09c-4c54-a095-205c8ef4306d",
  "GBDA Society": "HFBcDz0LSRsGqLtdAzgXBx",
  "Waterloo Data Science Club": "2e991229-46a6-4f98-97c9-2b0f6283d046",
  "Socratica": "7WZciq5UK6HSJWlcfwVc2B",
  "UW/UX": "UizgfAv6Gyc2eS8AkDJs8s",
  "UW Blueprint": "HFBcDz0LSRsGqLtdAzgElS",
  "Photography Club": "HFBcDz0LSRsGqLtdAzgXVx",
};

// Orgs that need to be created
const ORGS_TO_CREATE = [
  "Develop for Good",
  "SummerHacks",
  "Hack404",
  "Hack the North",
  "Waterloo Tech Week",
  "UW Film Club",
];

async function ensureOrgs(): Promise<void> {
  for (const name of ORGS_TO_CREATE) {
    if (ORG_MAP[name]) continue;
    console.log(`Creating organization: ${name}`);
    const doc = await client.create({ _type: "organization", name });
    ORG_MAP[name] = doc._id;
    console.log(`  ✓ Created (${doc._id})`);
  }
}

function orgRef(name: string): { _type: "reference"; _ref: string } {
  const id = ORG_MAP[name];
  if (!id) throw new Error(`No organization found for: "${name}"`);
  return { _type: "reference", _ref: id };
}

// ─── Manually cleaned member data from CSV ───

interface LeadershipEntry {
  positionTitle: string;
  org: string; // key into ORG_MAP
  startYear?: string;
  isCurrent?: boolean;
}

interface ExperienceEntry {
  positionTitle: string;
  company: string;
  startYear?: string;
  isCurrent?: boolean;
}

interface CleanedMember {
  firstName: string;
  lastName: string;
  schoolEmail: string;
  school: string;
  program: string;
  graduatingClass: string;
  publicEmail: string;
  bio: string;
  leadership: LeadershipEntry[];
  experience: ExperienceEntry[];
  workSchedule: string[];
  specialties: string[];
  portfolio?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  github?: string;
  driveImageUrl: string;
}

const members: CleanedMember[] = [
  {
    firstName: "Nancy",
    lastName: "Zheng",
    schoolEmail: "zhen1320@mylaurier.ca",
    school: "Wilfrid Laurier University",
    program: "Bachelors of Business Administration",
    graduatingClass: "2026",
    publicEmail: "nancyzheng06@gmail.com",
    bio: "Nancy is a fourth-year BBA student at Wilfrid Laurier University with a minor in UX design who cares deeply about building accessible products that help people. She's worked across agency and in-house teams, with a particular interest in design systems and creating UI that scales. Outside of design, she enjoys playing badminton, crafting, and spending time rock climbing.",
    leadership: [
      { positionTitle: "Figma Campus Leader", org: "Figma", startYear: "2025" },
      { positionTitle: "President", org: "UX Laurier", startYear: "2025" },
      { positionTitle: "UX Designer", org: "Develop for Good", startYear: "2024" },
      { positionTitle: "EVP", org: "UX Laurier", startYear: "2024" },
      { positionTitle: "VP of Marketing", org: "UX Laurier", startYear: "2023" },
    ],
    experience: [
      { positionTitle: "Product Designer", company: "1Password", startYear: "2026", isCurrent: true },
      { positionTitle: "Experience Designer", company: "Konrad Group", startYear: "2025" },
      { positionTitle: "UX Designer", company: "HopeSpring", startYear: "2023", isCurrent: true },
    ],
    workSchedule: ["Spring", "Fall"],
    specialties: ["UX/UI", "Branding"],
    portfolio: "https://nancyz.ca/",
    linkedin: "https://ca.linkedin.com/in/nancyzheng-",
    driveImageUrl: "https://drive.google.com/open?id=1BGkIvtx0o3gAC4eqboV0oT9HXiSuXaI2",
  },
  {
    firstName: "Winston",
    lastName: "Zhao",
    schoolEmail: "winston.zhao@uwaterloo.ca",
    school: "University of Waterloo",
    program: "Global Business and Digital Arts",
    graduatingClass: "2029",
    publicEmail: "hello@winstonzhao.ca",
    bio: "Winston is a designer and developer at the University of Waterloo who fell in love with digital design when developing mobile apps and website many years ago. He works across product, brand, and digital experiences as a designer at Yelo and a Figma Campus Leader, and has received multiple design awards. You'll find him sharing his passion for design on campus, from the GBDA Society to other fun workshops. Besides this, you'll spot him at a ramen place or biking and taking photos around the city.",
    leadership: [
      { positionTitle: "Campus Leader", org: "Figma", startYear: "2025", isCurrent: true },
      { positionTitle: "Curator", org: "Design Waterloo", startYear: "2025", isCurrent: true },
      { positionTitle: "Co-Director", org: "SummerHacks", startYear: "2025", isCurrent: true },
      { positionTitle: "President", org: "GBDA Society", startYear: "2025" },
      { positionTitle: "VP Design", org: "Waterloo Data Science Club", startYear: "2025" },
      { positionTitle: "Design Lead", org: "Hack404", startYear: "2025" },
    ],
    experience: [
      { positionTitle: "Designer", company: "Yelo", startYear: "2026", isCurrent: true },
      { positionTitle: "Co-Founder", company: "Villio AI", startYear: "2025" },
      { positionTitle: "Product Design Intern", company: "Augwa", startYear: "2025" },
      { positionTitle: "Product Design Intern", company: "Full Sprint / Heatmap.com", startYear: "2024" },
    ],
    workSchedule: ["Spring", "Fall", "Winter"],
    specialties: ["UX/UI", "Branding", "Design Engineering", "Photography"],
    portfolio: "https://winstonzhao.ca",
    instagram: "https://instagram.com/nomnomburger_",
    twitter: "https://x.com/nomnomburger_",
    linkedin: "https://linkedin.com/in/zhaowinston/",
    github: "https://github.com/Nomnomburger",
    driveImageUrl: "https://drive.google.com/open?id=1kOeFU4MqcT4rhHBkTT8fYtZ7z_l89NOM",
  },
  {
    firstName: "Jayleen",
    lastName: "Wu",
    schoolEmail: "jayleen.wu@uwaterloo.ca",
    school: "University of Waterloo",
    program: "Management Engineering",
    graduatingClass: "2029",
    publicEmail: "jayleen.wu@uwaterloo.ca",
    bio: "Jayleen brings ideas to real_FINAL_final_v3 with bold colours, motion typography, and a touch of music, always keeping the users at the heart of all her projects. She's studying Management Engineering at the University of Waterloo and recently designed the swag and branding for Hack the North. To sprinkle in some more fun, she loves creating minute-long travel reels, collecting golf balls from around the world, and jamming on her violin!",
    leadership: [
      { positionTitle: "Product Designer", org: "Hack the North", startYear: "2026" },
      { positionTitle: "Graphic Designer", org: "Hack the North", startYear: "2025" },
      { positionTitle: "Graphic Designer", org: "Waterloo Tech Week", startYear: "2025" },
    ],
    experience: [
      { positionTitle: "Project Manager", company: "BlackBerry QNX", startYear: "2025" },
    ],
    workSchedule: ["Winter", "Fall", "Spring"],
    specialties: ["UX/UI", "Branding", "Graphic Design", "Videography", "Motion Graphic"],
    portfolio: "https://www.jayleenwu.com/",
    instagram: "https://www.instagram.com/jayleenwuu/",
    twitter: "https://x.com/jayleenwu",
    linkedin: "https://www.linkedin.com/in/jayleenwu/",
    driveImageUrl: "https://drive.google.com/open?id=1hRvSF3HZn0QJZJefy5xeJn8qiA6R2Rws",
  },
  {
    firstName: "Keyan",
    lastName: "Virani",
    schoolEmail: "k3virani@uwaterloo.ca",
    school: "University of Waterloo",
    program: "Global Business and Digital Arts",
    graduatingClass: "2028",
    publicEmail: "k3virani@uwaterloo.ca",
    bio: "Keyan cares about excitement. You'll often find him rummaging around complex systems and comfy internet nooks. He loves designing intricate products with a high bar for quality and craft.",
    leadership: [
      { positionTitle: "Campus Leader", org: "Figma at Waterloo", isCurrent: true },
      { positionTitle: "Host", org: "Socratica", isCurrent: true },
      { positionTitle: "Mentor", org: "Hack the North" },
      { positionTitle: "Events", org: "UW/UX" },
      { positionTitle: "Product Designer", org: "UW Blueprint" },
    ],
    experience: [
      { positionTitle: "Product Designer", company: "RevisionDojo", startYear: "2024" },
      { positionTitle: "Product Designer", company: "Roblox", startYear: "2024" },
      { positionTitle: "Product Designer", company: "RBC", startYear: "2024" },
      { positionTitle: "Product Designer", company: "Intact", startYear: "2023" },
    ],
    workSchedule: ["Spring", "Winter", "Fall"],
    specialties: ["UX/UI", "Design Engineering"],
    portfolio: "https://www.keyan.design/",
    instagram: "https://www.instagram.com/_keyqn/",
    twitter: "https://x.com/keyanvirani",
    linkedin: "https://www.linkedin.com/in/keyanv/",
    driveImageUrl: "https://drive.google.com/open?id=1UVM9mCoFdICQVwwsbKRsspXPSEp-0Fsl",
  },
  {
    firstName: "Tiffany",
    lastName: "Trinh",
    schoolEmail: "ttttrinh@uwaterloo.ca",
    school: "University of Waterloo",
    program: "Global Business and Digital Arts",
    graduatingClass: "2027",
    publicEmail: "tiffany.trinh204@gmail.com",
    bio: "Tiffany is a creative marketing and post-production specialist in her final year of Global Business and Digital Arts at the University of Waterloo. She enjoys designing user experiences that balance functionality with visual storytelling. Outside of work, she's passionate about dance and fashion.",
    leadership: [
      { positionTitle: "Host", org: "Socratica", startYear: "2023" },
      { positionTitle: "Branding Lead", org: "UW/UX", startYear: "2022" },
    ],
    experience: [
      { positionTitle: "Creative Production and Marketing Associate", company: "Onward Media Group", startYear: "2026", isCurrent: true },
      { positionTitle: "UX/UI Designer", company: "Claims AI", startYear: "2025" },
      { positionTitle: "Graphic Design Lead", company: "Warriors Esports", startYear: "2023" },
    ],
    workSchedule: ["Winter", "Spring", "Fall"],
    specialties: ["UX/UI", "Branding", "Graphic Design", "Videography", "Fashion", "Motion Graphic", "3D Graphics", "UX Research"],
    portfolio: "https://tiffanytrinh.ca",
    instagram: "https://www.instagram.com/wootrbl/",
    twitter: "https://x.com/designtrbl",
    linkedin: "https://www.linkedin.com/in/tiffanytttrinh/",
    driveImageUrl: "https://drive.google.com/open?id=1f9knEZ2aN_nr99PeYpfvVP4wwloCCyS3",
  },
  {
    firstName: "Victoria",
    lastName: "Feng",
    schoolEmail: "v9feng@uwaterloo.ca",
    school: "University of Waterloo",
    program: "Geomatics",
    graduatingClass: "2028",
    publicEmail: "victoria.feng@uwaterloo.ca",
    bio: "Victoria daydreams in colours and shapes. Often scheming in figma files and davinci edits, she dabbles in event operations and strategy. With so many questions for the universe, she can get hyper fascinated over the psychology of why while studying the science of where.",
    leadership: [
      { positionTitle: "Events", org: "UW Film Club", startYear: "2023" },
      { positionTitle: "Events Lead", org: "Photography Club", startYear: "2024" },
      { positionTitle: "Host", org: "Socratica", startYear: "2024", isCurrent: true },
    ],
    experience: [
      { positionTitle: "Assistant & Strategist", company: "New", startYear: "2025", isCurrent: true },
      { positionTitle: "Research Assistant", company: "Georgian Bay Biosphere", startYear: "2025" },
    ],
    workSchedule: ["Spring", "Fall"],
    specialties: ["Web", "Graphic Design", "Videography", "Illustration"],
    portfolio: "https://victoriafeng.framer.website/",
    instagram: "https://www.instagram.com/mauveyposie/",
    twitter: "https://x.com/mauveyrosie",
    linkedin: "https://www.linkedin.com/in/feng-victoria/",
    driveImageUrl: "https://drive.google.com/open?id=1Sgkf3LklELHWDyO8A3nmWKncbeK5auIq",
  },
  {
    firstName: "Serena",
    lastName: "Li",
    schoolEmail: "serena.li@uwaterloo.ca",
    school: "University of Waterloo",
    program: "Systems Design Engineering",
    graduatingClass: "2026",
    publicEmail: "serena.li@uwaterloo.ca",
    bio: "Serena is a designer and artist who loves to dive into technical design problems, design for people, and get inspired by other creatives. You can probably find Serena at a local thrift store or figuring out their next creative endeavors on @aestronart",
    leadership: [
      { positionTitle: "Product Designer", org: "UW Blueprint", startYear: "2022" },
      { positionTitle: "VP of Design", org: "UW Blueprint", startYear: "2023" },
      { positionTitle: "Graphic Designer", org: "Hack the North", startYear: "2024" },
    ],
    experience: [
      { positionTitle: "Product Designer", company: "Ramp", startYear: "2025" },
      { positionTitle: "Product Designer", company: "1Password", startYear: "2024" },
      { positionTitle: "Product Designer", company: "Arctic Wolf", startYear: "2024" },
      { positionTitle: "Product Designer", company: "Verto Health", startYear: "2023" },
      { positionTitle: "Product Designer", company: "CIBC", startYear: "2022" },
    ],
    workSchedule: [],
    specialties: ["UX/UI", "Graphic Design", "Fashion", "Illustration"],
    portfolio: "https://www.serenali.ca/",
    instagram: "https://www.instagram.com/ssrenali/",
    linkedin: "https://www.linkedin.com/in/sserenali",
    driveImageUrl: "https://drive.google.com/open?id=1CcnohuNN2HgXJS9qaNsCbIVrjCYOg1oh",
  },
];

async function main() {
  // 1. Create any missing organizations
  console.log("=== Ensuring organizations exist ===\n");
  await ensureOrgs();

  // 2. Get next available memberId
  const existing = await client.fetch<Array<{ memberId: number | null }>>(
    `*[_type == "member"]{ memberId } | order(memberId desc)[0..0]`
  );
  let nextId = (existing[0]?.memberId ?? -1) + 1;
  console.log(`\n=== Importing members (starting at ID ${nextId}) ===\n`);

  let created = 0;
  let errors = 0;

  for (const m of members) {
    const slug = `${m.firstName}-${m.lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");

    console.log(`[${nextId}] ${m.firstName} ${m.lastName} (${slug})`);

    try {
      // Upload profile image
      let profileImage: any = undefined;
      try {
        profileImage = await uploadDriveImage(m.driveImageUrl, slug);
        console.log(`    ✓ Image uploaded`);
      } catch (imgErr: any) {
        console.log(`    ⚠ Image failed: ${imgErr.message}`);
      }

      const doc: Record<string, any> & { _type: string } = {
        _type: "member",
        memberId: nextId,
        firstName: m.firstName,
        lastName: m.lastName,
        slug: { _type: "slug", current: slug },
        schoolEmail: m.schoolEmail,
        school: m.school,
        program: m.program,
        graduatingClass: m.graduatingClass,
        publicEmail: m.publicEmail,
        bio: bioBlock(m.bio),
        leadership: m.leadership.map((l) => ({
          _key: key(),
          positionTitle: l.positionTitle,
          organization: orgRef(l.org),
          startYear: l.startYear,
          isCurrent: l.isCurrent || false,
        })),
        experience: m.experience.map((e) => ({
          _key: key(),
          positionTitle: e.positionTitle,
          company: e.company,
          startYear: e.startYear,
          isCurrent: e.isCurrent || false,
        })),
        specialties: m.specialties,
        portfolio: m.portfolio,
        instagram: m.instagram,
        twitter: m.twitter,
        linkedin: m.linkedin,
        github: m.github,
      };

      if (m.workSchedule.length > 0) {
        doc.workSchedule = m.workSchedule;
      }
      if (profileImage) {
        doc.profileImage = profileImage;
      }

      // Remove undefined values
      for (const k of Object.keys(doc)) {
        if (doc[k] === undefined) delete doc[k];
      }

      const result = await client.create(doc);
      console.log(`    ✓ Created (${result._id})`);
      created++;
      nextId++;
    } catch (err: any) {
      console.error(`    ✗ Error: ${err.message}`);
      errors++;
      nextId++;
    }
  }

  console.log(`\nDone! ${created} created, ${errors} errors`);
}

main().catch(console.error);
