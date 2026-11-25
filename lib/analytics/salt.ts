import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { fromDay, toDay } from "./range";

/**
 * Daily visitor salt. One random value per UTC day, shared by all instances through the
 * database; the nightly job deletes salts of past days, after which that day's visitor hashes
 * can no longer be linked to an IP address and user agent.
 */
const memo = new Map<string, string>();

export async function dailySalt(now: Date): Promise<string> {
  const day = toDay(now);
  const cached = memo.get(day);
  if (cached) return cached;
  const date = fromDay(day);
  await prisma.analyticsSalt.createMany({
    data: [{ date, salt: randomBytes(32).toString("hex") }],
    skipDuplicates: true,
  });
  const row = await prisma.analyticsSalt.findUniqueOrThrow({ where: { date } });
  memo.clear();
  memo.set(day, row.salt);
  return row.salt;
}

export function visitorHash(salt: string, ip: string, userAgent: string): string {
  return createHash("sha256").update(`${salt}\n${ip}\n${userAgent}`).digest("hex");
}

/** Removes salts of days before `now`'s day. */
export async function deleteOldSalts(now: Date): Promise<number> {
  const { count } = await prisma.analyticsSalt.deleteMany({
    where: { date: { lt: fromDay(toDay(now)) } },
  });
  return count;
}

/** Test hook: forget the in-memory salt. */
export function resetSaltMemo(): void {
  memo.clear();
}
