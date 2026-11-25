import { after, type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { AuthorizationError } from "@/lib/auth/errors";
import { isSameOrigin } from "@/lib/http/same-origin";
import { signRequestSchema, UPLOAD_TYPES } from "@/lib/upload/policy";
import { createIncomingUpload, purgeStaleIncoming } from "@/lib/supabase/storage";

/** Abandoned signed uploads (tab closed before completing) are removed after a day. */
const STALE_INCOMING_MS = 24 * 60 * 60 * 1000;

/**
 * Step 1 of an upload: an admin gets a one-time URL to put the file into `incoming/` directly
 * (no function body limit). Step 2 is `POST /api/upload`.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request.headers)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    await requireAdmin();
  } catch (failure) {
    if (failure instanceof AuthorizationError) {
      return NextResponse.json(
        { error: failure.code },
        { status: failure.code === "unauthenticated" ? 401 : 403 },
      );
    }
    throw failure;
  }

  const parsed = signRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalidInput" }, { status: 400 });
  if (parsed.data.size > UPLOAD_TYPES[parsed.data.type].maxBytes) {
    return NextResponse.json({ error: "tooLarge" }, { status: 413 });
  }

  const upload = await createIncomingUpload();
  if (!upload.ok) return NextResponse.json({ error: "serverError" }, { status: 502 });

  after(() => purgeStaleIncoming(STALE_INCOMING_MS).catch(() => 0));
  return NextResponse.json({ path: upload.path, signedUrl: upload.signedUrl });
}
