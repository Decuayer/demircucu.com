/**
 * Development / test seed data. Idempotent: safe to run repeatedly.
 * Run with `npm run db:seed` (guarded: local databases only).
 */
import { PrismaClient, type TagKind } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Fixed ids so a local Supabase user can be linked to these profiles later.
export const SEED_ADMIN_ID = "00000000-0000-4000-8000-000000000001";
export const SEED_USER_ID = "00000000-0000-4000-8000-000000000002";

// Parents first: `parent` refers to a slug defined earlier in the list.
const TAGS = [
  { slug: "web", name: "Web", nameTr: "Web Geliştirme", nameEn: "Web Development", kind: "DOMAIN" },
  {
    slug: "ai",
    name: "AI",
    nameTr: "Yapay Zeka",
    nameEn: "Artificial Intelligence",
    kind: "DOMAIN",
  },
  { slug: "python", name: "Python", kind: "LANGUAGE" },
  { slug: "typescript", name: "TypeScript", kind: "LANGUAGE", parent: "web" },
  {
    slug: "nextjs",
    name: "Next.js",
    kind: "FRAMEWORK",
    parent: "web",
    aliases: ["next-js", "next.js"],
  },
  {
    slug: "machine-learning",
    name: "Machine Learning",
    nameTr: "Makine Öğrenmesi",
    nameEn: "Machine Learning",
    kind: "CONCEPT",
    parent: "ai",
  },
] as const satisfies readonly {
  slug: string;
  name: string;
  nameTr?: string;
  nameEn?: string;
  kind: TagKind;
  parent?: string;
  aliases?: readonly string[];
}[];

const tagLinks = (...slugs: string[]) => ({
  create: slugs.map((slug) => ({ source: "MANUAL" as const, tag: { connect: { slug } } })),
});

export async function seed(prisma: PrismaClient): Promise<void> {
  await prisma.profile.upsert({
    where: { id: SEED_ADMIN_ID },
    update: {},
    create: { id: SEED_ADMIN_ID, email: "admin@example.test", name: "Admin", role: "ADMIN" },
  });
  await prisma.profile.upsert({
    where: { id: SEED_USER_ID },
    update: {},
    create: { id: SEED_USER_ID, email: "user@example.test", name: "Test User", role: "USER" },
  });

  for (const tag of TAGS) {
    const { parent, aliases, ...data } = tag as (typeof TAGS)[number] & {
      parent?: string;
      aliases?: readonly string[];
    };
    // Tags created before the tag tree existed (older local databases) get their fields too.
    const fields = { ...data, ...(parent ? { parent: { connect: { slug: parent } } } : {}) };
    const row = await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: fields,
      create: fields,
      select: { id: true },
    });
    if (aliases) {
      await prisma.tagAlias.createMany({
        data: aliases.map((alias) => ({ alias, tagId: row.id })),
        skipDuplicates: true,
      });
    }
  }

  await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      heroTitleTr: "Merhaba, ben Örnek",
      heroTitleEn: "Hi, I'm Example",
      heroSubTr: "Bilgisayar Mühendisi",
      heroSubEn: "Computer Engineer",
      aboutBioTr: "<p>Örnek biyografi.</p>",
      aboutBioEn: "<p>Sample biography.</p>",
      contactEmail: "hello@example.test",
      socialGithub: "https://github.com/example",
    },
  });

  await prisma.project.upsert({
    where: { slug: "sample-project" },
    update: {},
    create: {
      slug: "sample-project",
      titleTr: "Örnek Proje",
      titleEn: "Sample Project",
      summaryTr: "Seed verisiyle oluşturulmuş örnek proje.",
      summaryEn: "A sample project created by the seed script.",
      descriptionTr: "<p>Açıklama</p>",
      descriptionEn: "<p>Description</p>",
      githubUrl: "https://github.com/example/sample-project",
      featured: true,
      published: true,
      tags: tagLinks("typescript", "nextjs"),
    },
  });

  await prisma.project.upsert({
    where: { slug: "draft-project" },
    update: {},
    create: {
      slug: "draft-project",
      titleTr: "Taslak Proje",
      titleEn: "Draft Project",
      summaryTr: "Yayımlanmamış proje.",
      summaryEn: "Unpublished project.",
      published: false,
      tags: tagLinks("python"),
    },
  });

  const existingExperience = await prisma.experience.findFirst({
    where: { company: "Example Corp" },
  });
  if (!existingExperience) {
    await prisma.experience.create({
      data: {
        company: "Example Corp",
        positionTr: "Yazılım Mühendisi Stajyeri",
        positionEn: "Software Engineering Intern",
        descriptionTr: "Örnek deneyim.",
        descriptionEn: "Sample experience.",
        startDate: new Date("2025-06-16"),
        endDate: new Date("2025-07-11"),
        published: true,
        tags: tagLinks("python"),
      },
    });
  }

  const post = await prisma.blogPost.upsert({
    where: { slug: "hello-world" },
    update: {},
    create: {
      slug: "hello-world",
      titleTr: "Merhaba Dünya",
      titleEn: "Hello World",
      excerptTr: "İlk yazı.",
      excerptEn: "First post.",
      contentTr: "<p>Merhaba dünya.</p>",
      contentEn: "<p>Hello world.</p>",
      published: true,
      authorId: SEED_ADMIN_ID,
      tags: tagLinks("machine-learning"),
    },
  });

  await prisma.blogPost.upsert({
    where: { slug: "draft-post" },
    update: {},
    create: {
      slug: "draft-post",
      titleTr: "Taslak Yazı",
      titleEn: "Draft Post",
      excerptTr: "Yayımlanmamış.",
      excerptEn: "Unpublished.",
      contentTr: "<p>Taslak</p>",
      contentEn: "<p>Draft</p>",
      published: false,
      authorId: SEED_ADMIN_ID,
    },
  });

  const commentCount = await prisma.comment.count({ where: { postId: post.id } });
  if (commentCount === 0) {
    await prisma.comment.create({
      data: { postId: post.id, authorId: SEED_USER_ID, content: "Harika yazı!" },
    });
  }
  await prisma.like.upsert({
    where: { postId_userId: { postId: post.id, userId: SEED_USER_ID } },
    update: {},
    create: { postId: post.id, userId: SEED_USER_ID },
  });
}

/**
 * Extra experiences for local development and E2E (phase 8 timeline): an ongoing role with a
 * bulleted summary and a twelve-month role. Kept out of `seed()` so integration tests keep their
 * counts, and skipped on staging.
 */
export async function seedTimelineSamples(prisma: PrismaClient): Promise<void> {
  const timelineSamples = [
    {
      company: "Atlas Yazılım",
      positionTr: "Yazılım Mühendisi",
      positionEn: "Software Engineer",
      descriptionTr:
        "Şarj istasyonu yönetim platformunun arka uç ekibi.\n- Ödeme servisini yeniden yazdı\n- OCPP 2.0.1 desteği ekledi\n- Test kapsamını %40'tan %85'e çıkardı",
      descriptionEn:
        "Back-end team of a charging station management platform.\n- Rewrote the payment service\n- Added OCPP 2.0.1 support\n- Raised test coverage from 40% to 85%",
      startDate: new Date("2025-09-01"),
      endDate: null,
      locationTr: "İzmir, Türkiye",
      locationEn: "Izmir, Türkiye",
    },
    {
      company: "Kuzey Mobil",
      positionTr: "Mobil Geliştirici",
      positionEn: "Mobile Developer",
      descriptionTr: "Flutter ile iki tüketici uygulaması geliştirdi ve yayımladı.",
      descriptionEn: "Built and shipped two consumer apps with Flutter.",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-12-31"),
      locationTr: "İstanbul, Türkiye (uzaktan)",
      locationEn: "Istanbul, Türkiye (remote)",
    },
  ];
  for (const sample of timelineSamples) {
    const existing = await prisma.experience.findFirst({ where: { company: sample.company } });
    if (!existing) {
      await prisma.experience.create({
        data: { ...sample, published: true, tags: tagLinks("python") },
      });
    }
  }
}

/**
 * A long-form post for local development and E2E (phase 8 typography): headings, lists, code,
 * a quote, a table and a link, in both languages, so prose styles and line length can be checked.
 * Kept out of `seed()` like the timeline samples, and skipped on staging.
 */
export async function seedTypographySample(prisma: PrismaClient): Promise<void> {
  const body = (lang: "tr" | "en") => {
    const tr = lang === "tr";
    return [
      tr
        ? "<p>Bir yazının okunabilirliği, harf boyutundan çok satır uzunluğu ve satır aralığıyla ilgilidir. Göz, satır sonundan bir sonraki satırın başına zorlanmadan dönebilmelidir; bu yüzden uzun metinlerde satır başına 60 ile 75 karakter arası hedeflenir.</p>"
        : "<p>How readable a text is depends less on the font size than on line length and line spacing. The eye has to return from the end of a line to the start of the next without effort, which is why long-form text aims for 60 to 75 characters per line.</p>",
      tr
        ? '<p>Bu yazı, sitedeki <a href="https://example.com">okuma stillerini</a> denemek için hazırlandı: başlıklar, listeler, <code>satır içi kod</code>, kod blokları, alıntılar ve tablolar.</p>'
        : '<p>This post exists to exercise the site\'s <a href="https://example.com">reading styles</a>: headings, lists, <code>inline code</code>, code blocks, quotes and tables.</p>',
      tr ? "<h2>Ölçek ve ritim</h2>" : "<h2>Scale and rhythm</h2>",
      tr
        ? "<p>Başlıklar kendilerinden sonra gelen metne yakın, öncekinden uzak durmalıdır. Böylece okur, başlığın hangi bölüme ait olduğunu düşünmeden anlar.</p>"
        : "<p>Headings sit close to the text they introduce and far from the text before them, so readers see at once which section a heading belongs to.</p>",
      tr ? "<h3>Boşluk adımları</h3>" : "<h3>Spacing steps</h3>",
      tr
        ? "<ul><li>Bileşen içinde 4 piksellik adımlar</li><li>Sayfa düzeninde 8 piksellik adımlar</li><li>Bölümler arasında 64 ya da 96 piksel</li></ul>"
        : "<ul><li>4px steps inside components</li><li>8px steps for page layout</li><li>64 or 96px between sections</li></ul>",
      tr
        ? "<ol><li>Ölçeği belirle</li><li>Token olarak tanımla</li><li>Sayfaları token'lara taşı</li></ol>"
        : "<ol><li>Choose the scale</li><li>Define it as tokens</li><li>Move the pages onto the tokens</li></ol>",
      tr
        ? "<blockquote><p>Tipografi, metnin hizmetinde olmalıdır; dikkat çekmek için değil.</p></blockquote>"
        : "<blockquote><p>Typography exists to honour content, not to draw attention to itself.</p></blockquote>",
      tr ? "<h2>Kod ve tablolar</h2>" : "<h2>Code and tables</h2>",
      '<pre><code>export const scale = {\n  h1: "clamp(2rem, 1.65rem + 1.5vw, 3rem)",\n  body: "1rem",\n};</code></pre>',
      tr
        ? "<table><thead><tr><th>Token</th><th>Boyut</th><th>Satır yüksekliği</th></tr></thead><tbody><tr><td>h1</td><td>32–48 px</td><td>1.15</td></tr><tr><td>h2</td><td>24–30 px</td><td>1.25</td></tr><tr><td>body</td><td>16 px</td><td>1.6</td></tr></tbody></table>"
        : "<table><thead><tr><th>Token</th><th>Size</th><th>Line height</th></tr></thead><tbody><tr><td>h1</td><td>32–48 px</td><td>1.15</td></tr><tr><td>h2</td><td>24–30 px</td><td>1.25</td></tr><tr><td>body</td><td>16 px</td><td>1.6</td></tr></tbody></table>",
      tr
        ? "<p>Son olarak, iki temada da kontrastın yeterli olduğundan emin olmak gerekir; açık temada koyu gri, koyu temada açık gri metin kullanılır.</p>"
        : "<p>Finally, contrast has to hold in both themes: dark grey text on the light theme and light grey text on the dark one.</p>",
    ].join("");
  };
  await prisma.blogPost.upsert({
    where: { slug: "typography-sample" },
    update: {},
    create: {
      slug: "typography-sample",
      titleTr: "Okunabilir metin için tipografi ve boşluk",
      titleEn: "Typography and spacing for readable text",
      excerptTr: "Satır uzunluğu, ölçek ve ritim üzerine kısa bir örnek yazı.",
      excerptEn: "A short sample post on line length, scale and rhythm.",
      contentTr: body("tr"),
      contentEn: body("en"),
      published: true,
      authorId: SEED_ADMIN_ID,
      createdAt: new Date("2025-01-15T09:00:00Z"),
    },
  });
}

async function main(): Promise<void> {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    await seed(prisma);
    if (process.env.DB_TARGET !== "staging") {
      await seedTimelineSamples(prisma);
      await seedTypographySample(prisma);
    }
    console.log("Seed completed.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Run only when executed directly (prisma db seed), not when imported by tests.
if (process.argv[1]?.endsWith("seed.ts")) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
