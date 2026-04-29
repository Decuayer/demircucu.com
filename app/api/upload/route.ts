import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions/auth";
import { uploadFileToStorage, BUCKET_NAME } from "@/lib/supabase/storage";
import { saveMediaFileToDB } from "@/app/actions/media";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Authentication
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse FormData
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string || "general";
    const usedIn = formData.get("usedIn") as string || undefined;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 3. Process File
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const fileType = file.type;
    const fileSize = file.size; // in bytes

    // Check size limit (e.g. 5MB = 5 * 1024 * 1024 bytes)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (fileSize > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 5MB limit" }, { status: 400 });
    }

    // 4. Upload to Supabase Storage
    const uploadRes = await uploadFileToStorage(buffer, fileName, fileType, folder);
    
    if (!uploadRes.success || !uploadRes.path || !uploadRes.publicUrl) {
      return NextResponse.json({ error: uploadRes.error }, { status: 500 });
    }

    // 5. Save to Database
    const dbRes = await saveMediaFileToDB({
      name: fileName,
      url: uploadRes.publicUrl,
      type: fileType,
      size: fileSize,
      bucket: BUCKET_NAME,
      path: uploadRes.path,
      usedIn: usedIn,
    });

    if (!dbRes.success) {
      return NextResponse.json({ error: dbRes.error }, { status: 500 });
    }

    // 6. Return success
    return NextResponse.json({ 
      success: true, 
      url: uploadRes.publicUrl,
      file: dbRes.mediaFile
    });

  } catch (error: any) {
    console.error("Upload API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
