"use server";

import { after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { invalidate } from "@/lib/cache/tags";
import { fail, ok, toActionFailure, type ActionResult } from "@/lib/actions/result";
import { id as idSchema } from "@/lib/validation/common";
import { openRun, runSync, type SyncRequest } from "@/lib/github/runtime";
import { deleteFileFromStorage } from "@/lib/supabase/storage";
import { unusedGithubMediaIds } from "@/lib/data/admin";

const syncInput = z
  .object({
    /** One project (its repository); omitted = full sync. */
    projectId: idSchema.optional(),
    /** Re-render README and re-check documents even when nothing changed. */
    force: z.boolean().optional(),
  })
  .strict();

/**
 * "Sync now" (all repositories or one project). The run is recorded and executed after the
 * response; the admin page polls the run list.
 */
export async function startGithubSync(
  input: z.input<typeof syncInput> = {},
): Promise<ActionResult<{ runId: string }>> {
  try {
    await requireAdmin();
    const { projectId, force } = syncInput.parse(input);
    let request: SyncRequest = { scope: "all", force };
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { githubFullName: true, githubRepoId: true },
      });
      if (!project?.githubFullName) return fail("notFound");
      request = {
        scope: "repo",
        fullName: project.githubFullName,
        repoId: project.githubRepoId ? Number(project.githubRepoId) : undefined,
        force,
      };
    }
    const run = await openRun("MANUAL", request);
    if (!run.started) return fail("conflict");
    after(() => runSync(run.runId, request));
    return ok({ runId: run.runId });
  } catch (error) {
    return toActionFailure(error, "startGithubSync");
  }
}

const settingsInput = z
  .object({ includeForks: z.boolean(), includeArchived: z.boolean() })
  .strict();

export async function updateGithubSyncSettings(
  input: z.input<typeof settingsInput>,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const data = settingsInput.parse(input);
    await prisma.githubSyncSettings.upsert({
      where: { id: "main" },
      update: data,
      create: { id: "main", ...data },
    });
    return ok();
  } catch (error) {
    return toActionFailure(error, "updateGithubSyncSettings");
  }
}

const flagsInput = z
  .object({ published: z.boolean().optional(), featured: z.boolean().optional() })
  .strict();

/** Publish / unpublish / feature from the project list. */
export async function setProjectFlags(
  idInput: string,
  input: z.input<typeof flagsInput>,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = idSchema.parse(idInput);
    const data = flagsInput.parse(input);
    const project = await prisma.project.update({ where: { id }, data, select: { slug: true } });
    invalidate({ entity: "project", slug: project.slug });
    return ok();
  } catch (error) {
    return toActionFailure(error, "setProjectFlags");
  }
}

/** Moves a project one place up or down in the list order (orders are renumbered 0..n). */
export async function moveProject(
  idInput: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = idSchema.parse(idInput);
    const dir = z.enum(["up", "down"]).parse(direction);
    const slugs = await prisma.$transaction(async (tx) => {
      const rows = await tx.project.findMany({
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true, slug: true },
      });
      const index = rows.findIndex((r) => r.id === id);
      const target = dir === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= rows.length) return [];
      [rows[index], rows[target]] = [rows[target]!, rows[index]!];
      for (const [order, row] of rows.entries()) {
        await tx.project.update({ where: { id: row.id }, data: { order } });
      }
      return rows.map((r) => r.slug);
    });
    if (slugs.length) invalidate({ entity: "project", slug: slugs[0]! });
    return ok();
  } catch (error) {
    return toActionFailure(error, "moveProject");
  }
}

/**
 * Garbage collection of mirrored media (task 1.3): deletes the given GitHub files if they are
 * still unused. Never automatic; the admin confirms the list first.
 */
export async function deleteUnusedGithubMedia(
  idsInput: string[],
): Promise<ActionResult<{ deleted: number }>> {
  try {
    await requireAdmin();
    const ids = z.array(idSchema).max(500).parse(idsInput);
    const unused = new Set(await unusedGithubMediaIds());
    let deleted = 0;
    for (const id of ids.filter((i) => unused.has(i))) {
      try {
        await prisma.$transaction(async (tx) => {
          const file = await tx.mediaFile.delete({ where: { id }, select: { path: true } });
          const storage = await deleteFileFromStorage(file.path);
          if (!storage.success) throw new Error("storage delete failed");
        });
        deleted++;
      } catch (error) {
        console.error("[action:deleteUnusedGithubMedia]", (error as Error).message);
      }
    }
    invalidate({ entity: "media" });
    return ok({ deleted });
  } catch (error) {
    return toActionFailure(error, "deleteUnusedGithubMedia");
  }
}
