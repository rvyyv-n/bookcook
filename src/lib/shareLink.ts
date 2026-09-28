/**
 * Request links: a recipe request packed into the URL fragment of /import, so it never reaches a
 * server. (Recipe links, which are bigger, come with the backup work in phase 10.)
 */

export interface SharedRequest {
  /** The sender's id for it, so opening the link twice adds it once. */
  id: string;
  title: string;
  /** Who is asking. */
  from?: string;
  note?: string;
}

const KEY = 'request';

function toBase64Url(text: string): string {
  let bin = '';
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(data: string): string {
  const bin = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** The link to send: `<origin><base>import#request=…`. */
export function requestLink(request: SharedRequest, origin: string, base: string): string {
  const payload: Record<string, string> = { i: request.id, t: request.title };
  if (request.from) payload.f = request.from;
  if (request.note) payload.n = request.note;
  return `${origin}${base}import#${KEY}=${toBase64Url(JSON.stringify(payload))}`;
}

const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

/** The request in a link's fragment ("#request=…"), or undefined if there isn't a readable one. */
export function readRequestLink(hash: string): SharedRequest | undefined {
  const data = new URLSearchParams(hash.replace(/^#/, '')).get(KEY);
  if (!data) return undefined;
  try {
    const raw = JSON.parse(fromBase64Url(data)) as Record<string, unknown>;
    const id = text(raw.i, 64);
    const title = text(raw.t, 200);
    if (!id || !title) return undefined;
    return { id, title, from: text(raw.f, 100), note: text(raw.n, 1000) };
  } catch {
    return undefined;
  }
}
