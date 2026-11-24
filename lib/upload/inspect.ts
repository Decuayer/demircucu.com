import "server-only";
import { fileTypeFromBuffer } from "file-type";
import { evaluateUpload, type UploadDecision } from "./policy";

/** Detects the real file type from its content and applies the upload policy. */
export async function inspectUpload(buffer: Uint8Array): Promise<UploadDecision> {
  const detected = await fileTypeFromBuffer(buffer);
  return evaluateUpload(detected?.mime, buffer.byteLength);
}
