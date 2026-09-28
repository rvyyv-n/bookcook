// From a link: a Cloudflare Pages Function at /api/import?url=… that fetches a recipe page and
// returns its schema.org Recipe as a ParsedRecipe. Browsers can't read most recipe sites themselves
// (no CORS), so the page is fetched here. Nothing is stored.
import { recipeFromHtml } from '../../src/lib/parse/schemaOrg';

/** Why an import failed, for the app's failure state. */
export type ImportError = 'badUrl' | 'unreachable' | 'notHtml' | 'noRecipe';

/** Pages are cut off here: recipe JSON-LD sits in the head or near the top. */
const MAX_BYTES = 3_000_000;
const TIMEOUT_MS = 10_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' },
  });

const fail = (error: ImportError, status: number) => json({ error }, status);

/** Only public web pages: no other schemes, no local or private addresses. */
export function allowedUrl(raw: string | null): URL | undefined {
  if (!raw) return undefined;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:/i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
  if (url.username || url.password) return undefined;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host.includes('.') || host.endsWith('.local') || host.endsWith('.internal') || host === 'localhost') return undefined;
  if (/^(?:127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host)) return undefined;
  if (host.includes(':')) return undefined; // IPv6 literals
  return url;
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return res.text();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
    if (size >= MAX_BYTES) {
      await reader.cancel();
      break;
    }
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c.subarray(0, Math.min(c.byteLength, size - at)), at);
    at += c.byteLength;
    if (at >= size) break;
  }
  return new TextDecoder().decode(all);
}

export async function importRecipe(raw: string | null, fetcher: typeof fetch = fetch): Promise<Response> {
  const url = allowedUrl(raw);
  if (!url) return fail('badUrl', 400);
  let res: Response;
  try {
    res = await fetcher(url.toString(), {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'Mozilla/5.0 (compatible; Bookcook recipe import)',
      },
    });
  } catch {
    return fail('unreachable', 502);
  }
  if (!res.ok) return fail('unreachable', 502);
  if (!/html|xml/i.test(res.headers.get('content-type') ?? 'text/html')) return fail('notHtml', 422);
  const recipe = recipeFromHtml(await readCapped(res), url.toString());
  if (!recipe) return fail('noRecipe', 422);
  return json({ recipe });
}

interface Context {
  request: Request;
}

export const onRequestGet = ({ request }: Context) => importRecipe(new URL(request.url).searchParams.get('url'));
