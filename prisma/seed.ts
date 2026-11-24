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
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: {
        ...data,
        ...(parent ? { parent: { connect: { slug: parent } } } : {}),
        ...(aliases ? { aliases: { create: aliases.map((alias) => ({ alias })) } } : {}),
      },
    });
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

async function main(): Promise<void> {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    await seed(prisma);
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
