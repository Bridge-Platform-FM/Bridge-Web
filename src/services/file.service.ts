import { api } from "@/lib/axios";
import { API_ENDPOINTS } from "@/config/constant";
import type { DocType, DocSide } from "@/config/docTypes";
import type { ScanResult } from "@/types/api.types";

/** Extra context sent with a scan so the backend knows which document this is. */
export interface ScanMeta {
  docType: DocType;
  /** Only for two-sided documents (Aadhaar front/back). */
  side?: DocSide;
}

/**
 * Virus-scan a file and upload it to S3, returning its `s3Key`.
 *
 * Files go up as `multipart/form-data` under the field name the backend's multer
 * config expects (`image` for scan-img, `document` for scan-document), alongside
 * `docType` (and `side` for Aadhaar). We override the axios instance's default
 * `application/json` with `undefined` so the browser sets the multipart boundary
 * itself — a fixed `multipart/form-data` string would omit the boundary and multer
 * would see no file.
 */
async function scan(
  url: string,
  field: "image" | "document",
  file: File,
  meta: ScanMeta
): Promise<ScanResult> {
  const form = new FormData();
  form.append(field, file);
  form.append("docType", meta.docType);
  if (meta.side) form.append("side", meta.side);
  const { data } = await api.post<{ data: ScanResult }>(url, form, {
    headers: { "Content-Type": undefined },
  });
  return data.data;
}

/** Scan + upload a PNG/JPEG image (Aadhaar / PAN). */
export const scanImage = (file: File, meta: ScanMeta): Promise<ScanResult> =>
  scan(API_ENDPOINTS.SCAN_IMG, "image", file, meta);

/** Scan + upload a PDF document (incorporation certificate, pitch deck, …). */
export const scanDocument = (file: File, meta: ScanMeta): Promise<ScanResult> =>
  scan(API_ENDPOINTS.SCAN_DOCUMENT, "document", file, meta);

/**
 * Fetch the watermarked preview for a stored file by its `s3Key`. The endpoint
 * streams raw file bytes (image/PDF), so we request it as a `Blob` and let the
 * caller turn it into an object URL for rendering.
 */
export const getFilePreview = (key: string): Promise<Blob> =>
  api
    .get(API_ENDPOINTS.FILE_PREVIEW, { params: { key: key }, responseType: "blob" })
    .then((res) => res.data);
