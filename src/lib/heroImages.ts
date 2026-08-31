import { supabase } from '@/lib/supabaseClient';

export type HeroImage = {
  id: string;
  path: string;
  altText: string;
  sortOrder: number;
  isActive: boolean;
};

const HERO_STORAGE_KEY = 'cm-interiors.hero-images';
const DEFAULT_GITHUB_OWNER = 'hagobbie';
const DEFAULT_GITHUB_REPO = 'CMInteriorMarketing';
const DEFAULT_GITHUB_BRANCH = 'main';

const asText = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const envText = (key: string, fallback: string) =>
  (import.meta.env[key] as string | undefined)?.trim() || fallback;

const githubRawAssetUrl = (path: string) => {
  const normalized = path.replace(/^\/+/, '');
  const repositoryPath = normalized.startsWith('public/')
    ? normalized
    : `public/${normalized}`;
  const encodedPath = repositoryPath
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

  return `https://raw.githubusercontent.com/${encodeURIComponent(
    envText('VITE_GITHUB_OWNER', DEFAULT_GITHUB_OWNER),
  )}/${encodeURIComponent(
    envText('VITE_GITHUB_REPO', DEFAULT_GITHUB_REPO),
  )}/${encodeURIComponent(
    envText('VITE_GITHUB_BRANCH', DEFAULT_GITHUB_BRANCH),
  )}/${encodedPath}`;
};

export const publicHeroUrl = (path: string) => {
  if (/^(https?:|data:|blob:)/i.test(path)) return path;

  const normalized = path.replace(/^\/+/, '');
  if (
    normalized.startsWith('assets/') ||
    normalized.startsWith('public/assets/')
  ) {
    return githubRawAssetUrl(normalized);
  }

  return `${import.meta.env.BASE_URL}${normalized}`;
};

export const normalizeHeroImage = (
  row: Record<string, unknown>,
  index = 0,
): HeroImage => ({
  id: asText(row.id, `hero-${index + 1}`),
  path: asText(row.path ?? row.image_path ?? row.url),
  altText: asText(
    row.alt_text ?? row.altText,
    'CM Interiors architectural interior',
  ),
  sortOrder: asNumber(row.sort_order ?? row.sortOrder, index),
  isActive: row.is_active !== false && row.isActive !== false,
});

const sortHeroImages = (images: HeroImage[]) =>
  [...images]
    .filter((image) => image.path && image.isActive)
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.path.localeCompare(right.path),
    );

export const readStoredHeroImages = (): HeroImage[] => {
  try {
    const raw = window.localStorage.getItem(HERO_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortHeroImages(
      parsed.map((row, index) =>
        normalizeHeroImage(
          row && typeof row === 'object'
            ? (row as Record<string, unknown>)
            : {},
          index,
        ),
      ),
    );
  } catch {
    return [];
  }
};

export const writeStoredHeroImages = (images: HeroImage[]) => {
  try {
    window.localStorage.setItem(
      HERO_STORAGE_KEY,
      JSON.stringify(sortHeroImages(images)),
    );
  } catch {
    // Local storage is an enhancement for static hosting; Supabase remains
    // the durable source when browser storage is unavailable.
  }
};

export const mergeHeroImages = (...lists: HeroImage[][]) => {
  const byPath = new Map<string, HeroImage>();
  lists.flat().forEach((image, index) => {
    if (image.path) {
      byPath.set(image.path, {
        ...image,
        sortOrder: image.sortOrder ?? index,
      });
    }
  });
  return sortHeroImages(Array.from(byPath.values()));
};

export async function fetchHeroImages(): Promise<HeroImage[]> {
  const stored = readStoredHeroImages();

  try {
    const { data, error } = await supabase
      .from('hero_images')
      .select('id, path, alt_text, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data) return stored;

    const remote = data.map((row, index) =>
      normalizeHeroImage(row as Record<string, unknown>, index),
    );
    const merged = mergeHeroImages(remote, stored);
    writeStoredHeroImages(merged);
    return merged;
  } catch {
    return stored;
  }
}