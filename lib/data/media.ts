import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";

export async function saveMediaFile(data: {
  name: string;
  url: string;
  type: string;
  size: number;
  bucket: string;
  path: string;
  usedIn?: string;
}) {
  await requireAdmin();
  return prisma.mediaFile.create({ data });
}
