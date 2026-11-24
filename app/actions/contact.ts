"use server";

import { prisma } from "@/lib/prisma";
import { clientIp, consumeAll, RATE_LIMITS } from "@/lib/rate-limit";
import { fail, ok, toActionFailure, type ActionResult } from "@/lib/actions/result";
import { contactSchema } from "@/lib/validation/interactions";

export async function submitContactMessage(input: unknown): Promise<ActionResult> {
  try {
    const { website, ...data } = contactSchema.parse(input);
    // Honeypot filled: pretend success so the bot learns nothing, store nothing.
    if (website) return ok();

    const ip = await clientIp();
    const limit = await consumeAll([
      [RATE_LIMITS.contactPerIp, ip],
      [RATE_LIMITS.contactPerIpDaily, ip],
    ]);
    if (!limit.allowed) return fail("rateLimited");

    await prisma.contactMessage.create({ data });
    return ok();
  } catch (error) {
    return toActionFailure(error, "submitContactMessage");
  }
}
