// Supabase Edge Function: upload-inquiry-photo
//
// Despite the name (kept so no redeploy-under-a-new-name / re-configure-
// secrets was needed), this now handles every image upload on the site:
// customer inquiry photos, staff hero-slide images, the staff logo, and
// catalog product images. All of them used to PUT straight to the GitHub
// API from browser code using VITE_GITHUB_PAT — which meant that token
// sat in the site's bundled JS, readable by anyone with devtools open.
// This function holds the token server-side instead; the browser only
// ever sends image bytes and a destination folder, and gets a file path
// back.
//
// Image *viewing* is unaffected by this function and unaffected by
// Supabase's egress limits: once uploaded, images are served straight
// from raw.githubusercontent.com (see publicHeroUrl in
// src/lib/heroImages.ts).
//
// One-time setup (run from the project root, with the Supabase CLI):
//   supabase functions deploy upload-inquiry-photo
//   supabase secrets set GITHUB_PAT=ghp_xxxxxxxxxxxx
//   supabase secrets set GITHUB_OWNER=hagobbie
//   supabase secrets set GITHUB_REPO=CMInteriorMarketing
//   supabase secrets set GITHUB_BRANCH=main
//
// If you already deployed this for inquiry photos only, just redeploy —
// the secrets you already set are reused as-is.

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Every folder this function is allowed to write to. Requests naming
// anything else are rejected — this is what stops the endpoint from being
// used to write arbitrary paths into the repo.
const ALLOWED_FOLDERS = new Set(['inquiry-photos', 'hero', 'logo', 'productimage']);
const PUBLIC_ASSET_ROOT = 'public/assets';
const PUBLIC_ROOT = 'assets';
// Generous ceiling for the base64 payload — comfortably above anything a
// 1280px avif/webp/jpeg image compresses to, but still small enough to
// reject anyone trying to abuse this endpoint for large uploads. Logo/
// product uploads that skip compression are given a bit more room.
const MAX_BASE64_LENGTH = 20_000_000;
const FILENAME_PATTERN = /^[a-zA-Z0-9._-]+\.(avif|webp|jpe?g|png|gif|svg)$/i;

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });

const githubHeaders = (token: string) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'cm-interiors-image-upload',
});

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  let payload: {
    folder?: unknown;
    filename?: unknown;
    contentBase64?: unknown;
    overwrite?: unknown;
  };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const folder = typeof payload.folder === 'string' ? payload.folder.trim() : 'inquiry-photos';
  const filename = typeof payload.filename === 'string' ? payload.filename.trim() : '';
  const contentBase64 = typeof payload.contentBase64 === 'string' ? payload.contentBase64 : '';
  const overwrite = payload.overwrite === true;

  if (!ALLOWED_FOLDERS.has(folder)) {
    return jsonResponse({ error: `Uploads to "${folder}" are not allowed.` }, 400);
  }
  if (!FILENAME_PATTERN.test(filename)) {
    return jsonResponse({ error: 'Invalid or missing filename.' }, 400);
  }
  if (!contentBase64) {
    return jsonResponse({ error: 'Missing image data.' }, 400);
  }
  if (contentBase64.length > MAX_BASE64_LENGTH) {
    return jsonResponse({ error: 'Image is too large.' }, 400);
  }

  const token = Deno.env.get('GITHUB_PAT');
  if (!token) {
    return jsonResponse({ error: 'Image uploads are not configured on the server yet.' }, 500);
  }
  const owner = Deno.env.get('GITHUB_OWNER') || 'hagobbie';
  const repo = Deno.env.get('GITHUB_REPO') || 'CMInteriorMarketing';
  const branch = Deno.env.get('GITHUB_BRANCH') || 'main';

  const githubPath = `${PUBLIC_ASSET_ROOT}/${folder}/${filename}`;
  const publicPath = `${PUBLIC_ROOT}/${folder}/${filename}`;
  const endpoint = `https://api.github.com/repos/${owner}/${repo}/contents/${githubPath}`;

  // For fixed-filename uploads (the logo, or a product image being
  // replaced in place) we need the current file's sha before GitHub will
  // accept an update to that same path. A 404 here just means there's no
  // existing file yet, which is fine — we create it fresh below.
  let sha: string | undefined;
  if (overwrite) {
    try {
      const existing = await fetch(endpoint, { headers: githubHeaders(token) });
      if (existing.ok) {
        const existingBody = (await existing.json()) as { sha?: string };
        sha = existingBody.sha;
      } else if (existing.status !== 404) {
        const message = `GitHub returned HTTP ${existing.status} while checking for an existing file.`;
        return jsonResponse({ error: message }, 502);
      }
    } catch (networkError) {
      const message = networkError instanceof Error ? networkError.message : 'Network error.';
      return jsonResponse({ error: `Could not reach GitHub: ${message}` }, 502);
    }
  }

  let githubResponse: Response;
  try {
    githubResponse = await fetch(endpoint, {
      method: 'PUT',
      headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `${sha ? 'Update' : 'Add'} ${folder} image ${filename}`,
        content: contentBase64,
        branch,
        ...(sha ? { sha } : {}),
      }),
    });
  } catch (networkError) {
    const message = networkError instanceof Error ? networkError.message : 'Network error.';
    return jsonResponse({ error: `Could not reach GitHub: ${message}` }, 502);
  }

  if (!githubResponse.ok) {
    let message = `GitHub returned HTTP ${githubResponse.status}.`;
    try {
      const errorPayload = (await githubResponse.json()) as { message?: string };
      message = errorPayload.message || message;
    } catch {
      // Keep the default message if the error body isn't JSON.
    }
    return jsonResponse({ error: `Unable to upload image: ${message}` }, 502);
  }

  return jsonResponse({ path: publicPath });
});
