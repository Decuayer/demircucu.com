import type { TagKind } from "@prisma/client";

/**
 * Starting taxonomy (Phase 4, approved 2026-11-24). It is applied only when a tag is created
 * (auto-created from a GitHub topic or language, typed in the tag selector, or touched by
 * `scripts/migrate-tags.ts`): the tag gets this name, kind, parent and aliases, and missing
 * ancestors are created along the way. Edits made later in the admin panel always win; nothing
 * here overwrites an existing tag.
 *
 * Root nodes (no `parent`) are the skill categories. A parent must appear before its children.
 */
export interface TaxonomyNode {
  slug: string;
  name: string;
  /** Only for concepts that are translated. */
  nameTr?: string;
  nameEn?: string;
  kind: TagKind;
  parent?: string;
  /** Default true. */
  isSkill?: boolean;
  /** Alternative spellings, in canonical form (see canonicalize). */
  aliases?: readonly string[];
  /** simple-icons slug. */
  icon?: string;
}

const category = (slug: string, nameTr: string, nameEn: string): TaxonomyNode => ({
  slug,
  name: nameEn,
  nameTr,
  nameEn,
  kind: "DOMAIN",
});

const topic = (slug: string, name: string, aliases?: readonly string[]): TaxonomyNode => ({
  slug,
  name,
  kind: "TOPIC",
  isSkill: false,
  aliases,
});

export const TAXONOMY: readonly TaxonomyNode[] = [
  // --- Languages ------------------------------------------------------------------------------
  category("languages", "Programlama Dilleri", "Programming Languages"),
  { slug: "c", name: "C", kind: "LANGUAGE", parent: "languages", icon: "c" },
  {
    slug: "cpp",
    name: "C++",
    kind: "LANGUAGE",
    parent: "languages",
    aliases: ["cplusplus", "c-plus-plus"],
    icon: "cplusplus",
  },
  {
    slug: "csharp",
    name: "C#",
    kind: "LANGUAGE",
    parent: "languages",
    aliases: ["c-sharp"],
    icon: "dotnet",
  },
  { slug: "java", name: "Java", kind: "LANGUAGE", parent: "languages", icon: "openjdk" },
  {
    slug: "javascript",
    name: "JavaScript",
    kind: "LANGUAGE",
    parent: "languages",
    aliases: ["js"],
    icon: "javascript",
  },
  {
    slug: "typescript",
    name: "TypeScript",
    kind: "LANGUAGE",
    parent: "languages",
    aliases: ["ts"],
    icon: "typescript",
  },
  {
    slug: "python",
    name: "Python",
    kind: "LANGUAGE",
    parent: "languages",
    aliases: ["python3", "jupyter-notebook"],
    icon: "python",
  },
  { slug: "php", name: "PHP", kind: "LANGUAGE", parent: "languages", icon: "php" },
  { slug: "swift", name: "Swift", kind: "LANGUAGE", parent: "languages", icon: "swift" },
  { slug: "dart", name: "Dart", kind: "LANGUAGE", parent: "languages", icon: "dart" },
  { slug: "sql", name: "SQL", kind: "LANGUAGE", parent: "languages" },
  {
    slug: "bash",
    name: "Bash",
    kind: "LANGUAGE",
    parent: "languages",
    aliases: ["bash-script", "shell", "shell-script"],
    icon: "gnubash",
  },
  { slug: "html", name: "HTML", kind: "LANGUAGE", parent: "languages", aliases: ["html5"] },
  { slug: "css", name: "CSS", kind: "LANGUAGE", parent: "languages", aliases: ["css3"] },

  // --- Web ------------------------------------------------------------------------------------
  category("web", "Web Geliştirme", "Web Development"),
  { slug: "frontend", name: "Frontend", kind: "DOMAIN", parent: "web", aliases: ["front-end"] },
  { slug: "react", name: "React", kind: "LIBRARY", parent: "frontend", icon: "react" },
  {
    slug: "nextjs",
    name: "Next.js",
    kind: "FRAMEWORK",
    parent: "frontend",
    aliases: ["next", "next-js"],
    icon: "nextdotjs",
  },
  {
    slug: "tailwindcss",
    name: "Tailwind CSS",
    kind: "FRAMEWORK",
    parent: "frontend",
    aliases: ["tailwind"],
    icon: "tailwindcss",
  },
  { slug: "blazor", name: "Blazor", kind: "FRAMEWORK", parent: "frontend", icon: "blazor" },
  { slug: "ejs", name: "EJS", kind: "LIBRARY", parent: "frontend", icon: "ejs" },
  { slug: "backend", name: "Backend", kind: "DOMAIN", parent: "web", aliases: ["back-end"] },
  {
    slug: "nodejs",
    name: "Node.js",
    kind: "PLATFORM",
    parent: "backend",
    aliases: ["node", "node-js"],
    icon: "nodedotjs",
  },
  { slug: "express", name: "Express", kind: "FRAMEWORK", parent: "backend", icon: "express" },
  {
    slug: "dotnet",
    name: ".NET",
    kind: "FRAMEWORK",
    parent: "backend",
    aliases: ["dotnet8", "dotnet-core", "net-core", "aspnet", "aspnet-core"],
    icon: "dotnet",
  },
  { slug: "rest-api", name: "REST API", kind: "CONCEPT", parent: "backend", aliases: ["rest"] },
  { slug: "signalr", name: "SignalR", kind: "LIBRARY", parent: "backend" },
  { slug: "prisma", name: "Prisma", kind: "LIBRARY", parent: "backend", icon: "prisma" },

  // --- Mobile ---------------------------------------------------------------------------------
  category("mobile", "Mobil Geliştirme", "Mobile Development"),
  { slug: "flutter", name: "Flutter", kind: "FRAMEWORK", parent: "mobile", icon: "flutter" },
  { slug: "swiftui", name: "SwiftUI", kind: "FRAMEWORK", parent: "mobile", icon: "swift" },

  // --- Systems & desktop ----------------------------------------------------------------------
  category("systems", "Sistem ve Masaüstü", "Systems & Desktop"),
  {
    slug: "embedded-systems",
    name: "Embedded Systems",
    nameTr: "Gömülü Sistemler",
    nameEn: "Embedded Systems",
    kind: "DOMAIN",
    parent: "systems",
    aliases: ["embeded-systems", "embedded"],
  },
  {
    slug: "networking",
    name: "Networking",
    nameTr: "Ağ",
    nameEn: "Networking",
    kind: "DOMAIN",
    parent: "systems",
    aliases: ["network", "computer-networks"],
  },
  { slug: "linux", name: "Linux", kind: "PLATFORM", parent: "systems", icon: "linux" },
  { slug: "electron", name: "Electron", kind: "FRAMEWORK", parent: "systems", icon: "electron" },
  { slug: "qt", name: "Qt", kind: "FRAMEWORK", parent: "systems", aliases: ["qml"], icon: "qt" },

  // --- AI -------------------------------------------------------------------------------------
  category("ai", "Yapay Zeka", "Artificial Intelligence"),
  {
    slug: "machine-learning",
    name: "Machine Learning",
    nameTr: "Makine Öğrenmesi",
    nameEn: "Machine Learning",
    kind: "CONCEPT",
    parent: "ai",
    aliases: ["ml"],
  },
  {
    slug: "deep-learning",
    name: "Deep Learning",
    nameTr: "Derin Öğrenme",
    nameEn: "Deep Learning",
    kind: "CONCEPT",
    parent: "machine-learning",
    aliases: ["dl"],
  },
  {
    slug: "neural-networks",
    name: "Neural Networks",
    nameTr: "Sinir Ağları",
    nameEn: "Neural Networks",
    kind: "CONCEPT",
    parent: "deep-learning",
    aliases: ["neural-network"],
  },
  {
    slug: "transformer",
    name: "Transformer",
    kind: "CONCEPT",
    parent: "deep-learning",
    aliases: ["transformers"],
  },
  { slug: "pytorch", name: "PyTorch", kind: "LIBRARY", parent: "deep-learning", icon: "pytorch" },
  {
    slug: "nlp",
    name: "NLP",
    nameTr: "Doğal Dil İşleme",
    nameEn: "Natural Language Processing",
    kind: "CONCEPT",
    parent: "ai",
    aliases: ["natural-language-processing"],
  },
  {
    slug: "text-classification",
    name: "Text Classification",
    nameTr: "Metin Sınıflandırma",
    nameEn: "Text Classification",
    kind: "CONCEPT",
    parent: "nlp",
  },
  {
    slug: "generative-ai",
    name: "Generative AI",
    nameTr: "Üretken Yapay Zeka",
    nameEn: "Generative AI",
    kind: "CONCEPT",
    parent: "ai",
    aliases: ["genereative-ai", "genai"],
  },
  {
    slug: "llm",
    name: "LLM",
    nameTr: "Büyük Dil Modelleri",
    nameEn: "Large Language Models",
    kind: "CONCEPT",
    parent: "generative-ai",
    aliases: ["llms", "large-language-models"],
  },
  {
    slug: "pretraining",
    name: "Pretraining",
    nameTr: "Ön Eğitim",
    nameEn: "Pretraining",
    kind: "CONCEPT",
    parent: "llm",
    aliases: ["pre-training"],
  },
  {
    slug: "fine-tuning",
    name: "Fine-tuning",
    nameTr: "İnce Ayar",
    nameEn: "Fine-tuning",
    kind: "CONCEPT",
    parent: "llm",
    aliases: ["finetuning"],
  },
  {
    slug: "instruction-tuning",
    name: "Instruction Tuning",
    nameTr: "Talimat Ayarı",
    nameEn: "Instruction Tuning",
    kind: "CONCEPT",
    parent: "llm",
  },

  // --- Databases ------------------------------------------------------------------------------
  category("databases", "Veritabanları", "Databases"),
  {
    slug: "postgresql",
    name: "PostgreSQL",
    kind: "DATABASE",
    parent: "databases",
    aliases: ["postgres", "psql"],
    icon: "postgresql",
  },
  { slug: "postgis", name: "PostGIS", kind: "DATABASE", parent: "postgresql" },
  { slug: "mysql", name: "MySQL", kind: "DATABASE", parent: "databases", icon: "mysql" },
  {
    slug: "sqlite",
    name: "SQLite",
    kind: "DATABASE",
    parent: "databases",
    aliases: ["better-sqlite3", "sqlite3"],
    icon: "sqlite",
  },
  { slug: "mongodb", name: "MongoDB", kind: "DATABASE", parent: "databases", icon: "mongodb" },

  // --- Cloud & DevOps -------------------------------------------------------------------------
  category("cloud-devops", "Bulut ve DevOps", "Cloud & DevOps"),
  { slug: "docker", name: "Docker", kind: "TOOL", parent: "cloud-devops", icon: "docker" },
  { slug: "git", name: "Git", kind: "TOOL", parent: "cloud-devops", icon: "git" },
  {
    slug: "supabase",
    name: "Supabase",
    kind: "PLATFORM",
    parent: "cloud-devops",
    icon: "supabase",
  },
  {
    slug: "firebase",
    name: "Firebase",
    kind: "PLATFORM",
    parent: "cloud-devops",
    icon: "firebase",
  },
  { slug: "vercel", name: "Vercel", kind: "PLATFORM", parent: "cloud-devops", icon: "vercel" },

  // --- Software engineering -------------------------------------------------------------------
  category("software-engineering", "Yazılım Mühendisliği", "Software Engineering"),
  {
    slug: "clean-architecture",
    name: "Clean Architecture",
    kind: "CONCEPT",
    parent: "software-engineering",
  },
  { slug: "cqrs", name: "CQRS", kind: "CONCEPT", parent: "software-engineering" },
  {
    slug: "testing",
    name: "Testing",
    nameTr: "Test",
    nameEn: "Testing",
    kind: "CONCEPT",
    parent: "software-engineering",
    aliases: ["software-testing"],
  },
  {
    slug: "api-testing",
    name: "API Testing",
    nameTr: "API Testi",
    nameEn: "API Testing",
    kind: "CONCEPT",
    parent: "testing",
  },
  { slug: "selenium", name: "Selenium", kind: "TOOL", parent: "testing", icon: "selenium" },

  // --- Not skills: project types, companies, descriptive topics --------------------------------
  topic("website", "Website", ["web-site"]),
  topic("desktop-app", "Desktop App", ["desktop-application"]),
  topic("mobile-app", "Mobile App", ["mobile-application"]),
  topic("game", "Game", ["games"]),
  topic("enterprise", "Enterprise"),
  topic("flyrank", "FlyRank"),
  topic("vestel", "Vestel"),
  topic("emergency-dispatch", "Emergency Dispatch"),
  topic("from-scratch", "From Scratch"),
  topic("gpt-2", "GPT-2", ["gpt2"]),
  topic("telemetry", "Telemetry"),
  topic("crud", "CRUD"),
  topic("chromium", "Chromium"),
];

const BY_KEY = new Map<string, TaxonomyNode>();
for (const node of TAXONOMY) {
  BY_KEY.set(node.slug, node);
  for (const alias of node.aliases ?? []) BY_KEY.set(alias, node);
}

/** Taxonomy node for a canonical key (slug or alias), if the taxonomy knows it. */
export function taxonomyNode(key: string): TaxonomyNode | undefined {
  return BY_KEY.get(key);
}

/** Position of the node among the taxonomy (used as the initial `order`). */
export function taxonomyOrder(slug: string): number {
  const index = TAXONOMY.findIndex((node) => node.slug === slug);
  return index === -1 ? 0 : index;
}
