import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";

export async function saveMediaFile(data: {
  name: string;
  type: string;
  size: number;
  bucket: string;
  path: string;
}) {
  await requireAdmin();
  return prisma.mediaFile.create({
    data: { ...data, source: "UPLOAD" },
    select: { id: true, name: true, type: true, size: true, path: true, createdAt: true },
  });
}
