import { deflateSync, Inflate, strFromU8, strToU8 } from 'fflate';
import type { Ingredient, Recipe, Step, StoryAnswer } from '../db/types';
import type { Quantity } from './parse/types';

/**
 * Share links: a recipe request or a whole recipe packed into the URL fragment of /import, so it
 * never reaches a server. Recipes are compressed and carry the recipe's text only: no photos, voice
 * notes or transcript, which stay with the original (as they do for Make Mine), so links stay short
 * enough for a message.
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

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(data: string): Uint8Array {
  const bin = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

const toBase64Url = (text: string) => bytesToBase64Url(new TextEncoder().encode(text));
const fromBase64Url = (data: string) => new TextDecoder().decode(base64UrlToBytes(data));

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

// Recipe links

export interface SharedRecipe {
  /** The sender's recipe id, so opening the link twice adds it once. */
  id: string;
  /** The text of the recipe; photos, voice notes, the transcript, collections and the cook log stay behind. */
  recipe: Partial<Recipe> & { title: string };
  /** The request this recipe answers (the asker's id for it), so their request can be marked told. */
  requestId?: string;
}

const RECIPE_KEY = 'recipe';
/** Longer than any real recipe; guards against a link that would inflate to something huge. */
const MAX_LINK = 100_000;
const MAX_INFLATED = 1_000_000;

/** Inflate, giving up past MAX_INFLATED bytes. */
function inflateCapped(data: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = [];
  let size = 0;
  const inflate = new Inflate((chunk) => {
    size += chunk.length;
    if (size > MAX_INFLATED) throw new Error('too big');
    chunks.push(chunk);
  });
  inflate.push(data, true);
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** The link to send: `<origin><base>import#recipe=…`. */
export function recipeLink(shared: SharedRecipe, origin: string, base: string): string {
  const r = shared.recipe;
  const payload = {
    i: shared.id,
    q: shared.requestId,
    t: r.title,
    a: r.author || undefined,
    d: r.description,
    s: r.servings,
    p: r.prepMinutes,
    c: r.cookMinutes,
    g: r.tags?.length ? r.tags : undefined,
    n: r.ingredients?.map((i) => [i.name, i.quantity ?? 0, i.unit ?? '', i.note ?? '', i.section ?? '']),
    x: r.steps?.filter((st) => st.text).map((st) => (st.timerSeconds ? [st.text, st.timerSeconds] : [st.text])),
    k: r.tips,
    y: r.story?.filter((st) => st.answer).map((st) => [st.prompt, st.answer]),
  };
  const packed = deflateSync(strToU8(JSON.stringify(payload)), { level: 9 });
  return `${origin}${base}import#${RECIPE_KEY}=${bytesToBase64Url(packed)}`;
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function quantity(v: unknown): Quantity | undefined {
  if (Array.isArray(v) && v.length === 2 && num(v[0]) !== undefined && num(v[1]) !== undefined) return [v[0], v[1]];
  return num(v);
}

/** The recipe in a link's fragment ("#recipe=…"), or undefined if there isn't a readable one. */
export function readRecipeLink(hash: string): SharedRecipe | undefined {
  const data = new URLSearchParams(hash.replace(/^#/, '')).get(RECIPE_KEY);
  if (!data || data.length > MAX_LINK) return undefined;
  try {
    const raw = JSON.parse(strFromU8(inflateCapped(base64UrlToBytes(data)))) as Record<string, unknown>;
    const id = text(raw.i, 64);
    const title = text(raw.t, 200);
    if (!id || !title) return undefined;
    const ingredients: Partial<Ingredient>[] = arr(raw.n).flatMap((row) => {
      const [name, q, unit, note, section] = arr(row);
      const n = text(name, 200);
      return n ? [{ name: n, quantity: quantity(q), unit: text(unit, 40), note: text(note, 500), section: text(section, 100) }] : [];
    });
    const steps: Partial<Step>[] = arr(raw.x).flatMap((row) => {
      const [body, seconds] = arr(row);
      const t = text(body, 5000);
      return t ? [{ text: t, timerSeconds: num(seconds) }] : [];
    });
    const story: StoryAnswer[] = arr(raw.y).flatMap((row) => {
      const [prompt, answer] = arr(row);
      const a = text(answer, 5000);
      return a ? [{ prompt: text(prompt, 300) ?? '', answer: a }] : [];
    });
    const recipe: SharedRecipe['recipe'] = {
      title,
      author: text(raw.a, 100) ?? '',
      description: text(raw.d, 2000),
      servings: num(raw.s),
      prepMinutes: num(raw.p),
      cookMinutes: num(raw.c),
      tags: arr(raw.g).flatMap((g) => text(g, 60) ?? []),
      ingredients: ingredients as Ingredient[],
      steps: steps as Step[],
      tips: text(raw.k, 5000),
      story,
    };
    return { id, recipe, requestId: text(raw.q, 64) };
  } catch {
    return undefined;
  }
}
