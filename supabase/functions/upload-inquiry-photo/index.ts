// Supabase Edge Function: upload-inquiry-photo
//
// This is the ONLY place the GitHub token is used. The browser (customer
// inquiry basket) resizes and compresses the photo client-side, then sends
// the already-small result here. This function reads the GitHub token from
// a Supabase secret (never sent to the browser, never bundled into the
// site's JS) and commits the file to the repo on the caller's behalf.
//
// Why this exists: any token usable directly from browser code is readable
// by anyone who opens devtools, since anonymous visitors submit inquiries.
// Moving the token into an Edge Function means the browser only ever gets
// a "please upload this for me" round trip and a file path back.
//
// Photo *viewing* is unaffected by this function and unaffected by
// Supabase's egress limits: once uploaded, photos are served straight from
// raw.githubusercontent.com (see publicHeroUrl in src/lib/heroImages.ts),
// exactly like hero and product images already are.
//
// One-time setup (run from the project root, with the Supabase CLI):
//   supabase functions deploy upload-inquiry-photo
//   supabase secrets set GITHUB_PAT=ghp_xxxxxxxxxxxx
//   supabase secrets set GITHUB_OWNER=hagobbie
//   supabase secrets set GITHUB_REPO=CMInteriorMarketing
//   supabase secrets set GITHUB_BRANCH=main
//
// GITHUB_OWNER/GITHUB_REPO/GITHUB_BRANCH fall back to sensible defaults
// below if you skip setting them, but GITHUB_PAT is required — the
// function returns a clear error until it's set.

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PHOTO_FOLDER = 'public/assets/inquiry-photos';
const PUBLIC_PHOTO_FOLDER = 'assets/inquiry-photos';
// Generous ceiling for the base64 payload — comfortably above anything a
// 1280px avif/webp/jpeg photo compresses to, but still small enough to
// reject anyone trying to abuse this endpoint for large uploads.
const MAX_BASE64_LENGTH = 8_000_000;
const FILENAME_PATTERN = /^[a-zA-Z0-9._-]+\.(avif|webp|jpe?g|png)$/;

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  let payload: { filename?: unknown; contentBase64?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const filename = typeof payload.filename === 'string' ? payload.filename.trim() : '';
  const contentBase64 =
    typeof payload.contentBase64 === 'string' ? payload.contentBase64 : '';

  if (!FILENAME_PATTERN.test(filename)) {
    return jsonResponse({ error: 'Invalid or missing filename.' }, 400);
  }
  if (!contentBase64) {
    return jsonResponse({ error: 'Missing photo data.' }, 400);
  }
  if (contentBase64.length > MAX_BASE64_LENGTH) {
    return jsonResponse({ error: 'Photo is too large.' }, 400);
  }

  const token = Deno.env.get('GITHUB_PAT');
  if (!token) {
    return jsonResponse(
      { error: 'Photo uploads are not configured on the server yet.' },
      500,
    );
  }
  const owner = Deno.env.get('GITHUB_OWNER') || 'hagobbie';
  const repo = Deno.env.get('GITHUB_REPO') || 'CMInteriorMarketing';
  const branch = Deno.env.get('GITHUB_BRANCH') || 'main';

  const githubPath = `${PHOTO_FOLDER}/${filename}`;
  const publicPath = `${PUBLIC_PHOTO_FOLDER}/${filename}`;
  const endpoint = `https://api.github.com/repos/${owner}/${repo}/contents/${githubPath}`;

  let githubResponse: Response;
  try {
    githubResponse = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'cm-interiors-inquiry-basket',
      },
      body: JSON.stringify({
        message: `Add inquiry photo ${filename}`,
        content: contentBase64,
        branch,
      }),
    });
  } catch (networkError) {
    const message =
      networkError instanceof Error ? networkError.message : 'Network error.';
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
    return jsonResponse({ error: `Unable to upload photo: ${message}` }, 502);
  }

  return jsonResponse({ path: publicPath });
});
