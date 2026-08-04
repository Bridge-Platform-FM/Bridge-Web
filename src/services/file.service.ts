import { api } from "@/lib/axios";
import { API_ENDPOINTS } from "@/config/constant";
import type { DocType, DocSide } from "@/config/docTypes";
import type { ScanResult, GetKycDocsResponse } from "@/types/api.types";

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
 * Preview cache, keyed by the (immutable) `s3Key`. Without it a chat thread with N
 * image attachments issues N separate blob downloads, and opening one of those images
 * in the preview modal downloads the very same bytes a second time.
 *
 * We cache the **Blob, never an object URL** — each consumer keeps creating and
 * revoking its own URL (see `lib/useFilePreview.ts`), so one component unmounting can
 * never blank out another that's sharing the same blob. Caching the promise also means
 * simultaneous mounts share a single in-flight request.
 */
const filePreviewCache = new Map<string, { at: number; promise: Promise<Blob> }>();
const FILE_PREVIEW_TTL_MS = 10 * 60_000;

/** Drop every cached preview. Called on logout so blobs don't leak across sessions. */
export function clearFilePreviewCache(): void {
  filePreviewCache.clear();
}

/**
 * Fetch the watermarked preview for a stored file by its `s3Key`. The endpoint
 * streams raw file bytes (image/PDF), so we request it as a `Blob` and let the
 * caller turn it into an object URL for rendering.
 */
export const getFilePreview = (key: string): Promise<Blob> => {
  const hit = filePreviewCache.get(key);
  if (hit && Date.now() - hit.at < FILE_PREVIEW_TTL_MS) return hit.promise;

  const promise = api
    .get(API_ENDPOINTS.FILE_PREVIEW, { params: { key: key }, responseType: "blob" })
    .then((res) => res.data as Blob)
    .catch((err) => {
      // Never cache a failure — the hook's error state must stay retryable.
      if (filePreviewCache.get(key)?.promise === promise) filePreviewCache.delete(key);
      throw err;
    });

  filePreviewCache.set(key, { at: Date.now(), promise });
  return promise;
};

/**
 * Fetch the submitted KYC documents for the authenticated company along with the
 * submission/expiry timestamps (verification-status step). Some backends wrap the
 * payload in `{ data: … }`; we unwrap that case so callers always get the flat
 * response body.
 */
export const getKycDocs = (): Promise<GetKycDocsResponse> =>
  api.get<GetKycDocsResponse | { data: GetKycDocsResponse }>(API_ENDPOINTS.GET_KYC_DOCS).then((res) => {
    const body = res.data as GetKycDocsResponse & { data?: GetKycDocsResponse };
    return body.data ?? body;
  });
