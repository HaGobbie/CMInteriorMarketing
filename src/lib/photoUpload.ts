import { supabase } from '@/lib/supabaseClient';
import { publicHeroUrl } from '@/lib/heroImages';

// Photos attached to a customer inquiry are resized/compressed here in the
// browser, then handed to the `upload-inquiry-photo` Supabase Edge
// Function (see supabase/functions/upload-inquiry-photo/index.ts), which
// holds the GitHub token server-side and commits the file to
// public/assets/inquiry-photos/ on our behalf.
//
// This file intentionally does NOT talk to GitHub directly and does NOT
// hold any GitHub credentials — that was the earlier approach, but it
// meant the token was readable by anyone who opened devtools on the
// public, unauthenticated inquiry basket. Routing the upload through the
// Edge Function keeps the token server-side.
//
// Note this only affects the (rare) upload step. Photo *viewing* still
// goes straight to raw.githubusercontent.com afterwards via
// publicHeroUrl(), same as hero and product images, so it doesn't touch
// Supabase's egress quota on every view.

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
      reject(new Error('The selected photo could not be read.'));
    };
    img.src = url;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

type CompressedImage = { blob: Blob; extension: string };

// Resizes the image so its longest side is at most MAX_DIMENSION px (never
// upscales smaller photos), then tries to encode it as AVIF first for the
// best compression, falling back to WebP and finally JPEG for browsers
// that cannot encode AVIF client-side yet.
async function compressImage(file: File): Promise<CompressedImage> {
  const image = await loadImage(file);
  let { width, height } = image;
  if (width <= 0 || height <= 0) {
    throw new Error('The selected photo could not be measured.');
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
  if (!context) throw new Error('Photo resizing is not supported in this browser.');
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

  throw new Error('This browser could not compress the selected photo.');
}

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const separatorIndex = result.indexOf(',');
      resolve(separatorIndex === -1 ? result : result.slice(separatorIndex + 1));
    };
    reader.onerror = () => reject(new Error('The compressed photo could not be encoded.'));
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

export type UploadedInquiryPhoto = {
  path: string;
  url: string;
};

export async function uploadInquiryPhoto(file: File): Promise<UploadedInquiryPhoto> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Please choose a photo smaller than 20 MB.');
  }

  const compressed = await compressImage(file);
  const filename = `inquiry-${Date.now()}-${randomId()}.${compressed.extension}`;
  const contentBase64 = await blobToBase64(compressed.blob);

  const { data, error } = await supabase.functions.invoke<{
    path?: string;
    error?: string;
  }>('upload-inquiry-photo', {
    body: { filename, contentBase64 },
  });

  if (error) {
    throw new Error(
      await functionErrorMessage(error, 'Unable to upload photo.'),
    );
  }
  if (!data?.path) {
    throw new Error(data?.error || 'Unable to upload photo.');
  }

  return { path: data.path, url: publicHeroUrl(data.path) };
}
