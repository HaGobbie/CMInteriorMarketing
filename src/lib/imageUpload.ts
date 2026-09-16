import { supabase } from '@/lib/supabaseClient';
import { publicHeroUrl } from '@/lib/heroImages';

// One upload path for every image the site writes to the repo: the
// customer inquiry basket, staff hero-slide uploads, the staff logo
// uploader, and catalog product images. All of them used to duplicate
// their own "PUT straight to the GitHub API with VITE_GITHUB_PAT"
// implementation — which meant the token sat in the browser's bundled JS
// for every one of those flows, readable by anyone with devtools open,
// and any fix to the upload logic had to be repeated four times.
//
// Now they all call uploadSiteImage() below, which compresses the image
// client-side (where relevant) and hands it to the `upload-inquiry-photo`
// Supabase Edge Function — the same one built for inquiry photos — which
// holds the GitHub token server-side. The function's name is a holdover
// from when it only handled inquiry photos; it now takes a `folder`
// parameter and handles all site images, so there's no need to deploy a
// second function or configure a second set of secrets.

const FOLDERS = ['inquiry-photos', 'hero', 'logo', 'productimage'] as const;
export type ImageFolder = (typeof FOLDERS)[number];

const MAX_DIMENSION = 1280;

const randomId = () => Math.random().toString(36).slice(2, 9);

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The selected image could not be read.'));
    };
    img.src = url;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

type CompressedImage = { blob: Blob; extension: string };

// Resizes the image so its longest side is at most MAX_DIMENSION px (never
// upscales smaller images), then tries to encode it as AVIF first for the
// best compression, falling back to WebP and finally JPEG for browsers
// that cannot encode AVIF client-side yet.
async function compressImage(file: File): Promise<CompressedImage> {
  const image = await loadImage(file);
  let { width, height } = image;
  if (width <= 0 || height <= 0) {
    throw new Error('The selected image could not be measured.');
  }
  if (Math.max(width, height) > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image resizing is not supported in this browser.');
  context.drawImage(image, 0, 0, width, height);

  const avif = await canvasToBlob(canvas, 'image/avif', 0.65);
  if (avif && avif.type === 'image/avif') {
    return { blob: avif, extension: 'avif' };
  }

  const webp = await canvasToBlob(canvas, 'image/webp', 0.82);
  if (webp && webp.type === 'image/webp') {
    return { blob: webp, extension: 'webp' };
  }

  const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.85);
  if (jpeg) return { blob: jpeg, extension: 'jpg' };

  throw new Error('This browser could not compress the selected image.');
}

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const separatorIndex = result.indexOf(',');
      resolve(separatorIndex === -1 ? result : result.slice(separatorIndex + 1));
    };
    reader.onerror = () => reject(new Error('The compressed image could not be encoded.'));
    reader.readAsDataURL(blob);
  });

// Reads a helpful error message out of a Supabase FunctionsError. The
// generic error.message is usually just "Edge Function returned a
// non-2xx status code" — the useful detail is in error.context, which is
// the raw Response from the function.
const functionErrorMessage = async (error: unknown, fallback: string) => {
  const context = (error as { context?: Response } | null)?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = (await context.json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      // Fall through to the generic message below.
    }
  }
  return error instanceof Error ? error.message : fallback;
};

export type UploadedSiteImage = {
  path: string;
  url: string;
};

export type UploadSiteImageOptions = {
  folder: ImageFolder;
  // Fixed filename to always write to (e.g. the logo, which always
  // overwrites the same path). Omit to auto-generate a unique filename.
  filename?: string;
  // true = look up and include the existing file's sha so this overwrites
  // it in place, instead of failing because the path already exists.
  // Only relevant when `filename` is fixed.
  overwrite?: boolean;
  // false = upload the original file bytes unchanged, skipping resize and
  // re-encoding. Used for the logo, whose exact PNG path is hardcoded in
  // a few places across the app, so its format can't silently change.
  compress?: boolean;
};

export async function uploadSiteImage(
  file: File,
  options: UploadSiteImageOptions,
): Promise<UploadedSiteImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Please choose an image smaller than 20 MB.');
  }

  let blob: Blob = file;
  let extension = (file.name.split('.').pop() || 'png').toLowerCase();
  if (options.compress !== false) {
    const compressed = await compressImage(file);
    blob = compressed.blob;
    extension = compressed.extension;
  }

  const filename = options.filename || `${options.folder}-${Date.now()}-${randomId()}.${extension}`;
  const contentBase64 = await blobToBase64(blob);

  const { data, error } = await supabase.functions.invoke<{
    path?: string;
    error?: string;
  }>('upload-inquiry-photo', {
    body: {
      folder: options.folder,
      filename,
      contentBase64,
      overwrite: Boolean(options.overwrite),
    },
  });

  if (error) {
    throw new Error(await functionErrorMessage(error, 'Unable to upload image.'));
  }
  if (!data?.path) {
    throw new Error(data?.error || 'Unable to upload image.');
  }

  return { path: data.path, url: publicHeroUrl(data.path) };
}

// Thin wrapper kept for the inquiry basket's call site.
export const uploadInquiryPhoto = (file: File) => uploadSiteImage(file, { folder: 'inquiry-photos' });

// Turns a stored photo URL (whatever publicHeroUrl produced when it was
// uploaded — a raw.githubusercontent.com URL, or a relative /assets/...
// path) back into the repo path the GitHub Contents API needs to delete
// it. Returns null for anything that doesn't look like one of our own
// uploaded assets, so callers can skip it safely.
export function repoPathFromImageUrl(url: string): string | null {
  const match = url.match(/\/assets\/(.+)$/);
  if (!match) return null;
  return `public/assets/${match[1]}`;
}

// Permanently deletes uploaded images from the repo — used when an order
// is purged from the recycle bin (never on a soft delete, since the
// order might still be restored). Best-effort: individual failures are
// collected and returned rather than thrown, so one missing/already-gone
// file doesn't stop the rest from being cleaned up.
export async function deleteSiteImages(urls: string[]): Promise<{ failed: string[] }> {
  const paths = [...new Set(urls.map(repoPathFromImageUrl).filter((path): path is string => Boolean(path)))];
  if (paths.length === 0) return { failed: [] };

  const { data, error } = await supabase.functions.invoke<{
    deleted?: string[];
    failed?: string[];
    error?: string;
  }>('upload-inquiry-photo', {
    body: { action: 'delete', paths },
  });

  if (error) {
    return { failed: paths };
  }
  return { failed: data?.failed ?? [] };
}

