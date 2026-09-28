import { db, newId } from './db';
import type { RecipeRequest } from './types';

export async function listRequests(): Promise<RecipeRequest[]> {
  return db.requests.orderBy('createdAt').reverse().toArray();
}

export function getRequest(id: string): Promise<RecipeRequest | undefined> {
  return db.requests.get(id);
}

export async function addRequest(
  input: Omit<RecipeRequest, 'id' | 'createdAt'> & Partial<Pick<RecipeRequest, 'id' | 'createdAt'>>,
): Promise<RecipeRequest> {
  const request: RecipeRequest = { ...input, id: input.id ?? newId(), createdAt: input.createdAt ?? Date.now(), title: input.title.trim() };
  await db.requests.put(request);
  return request;
}

export async function deleteRequest(id: string): Promise<RecipeRequest | undefined> {
  const r = await db.requests.get(id);
  await db.requests.delete(id);
  return r;
}

export async function restoreRequest(r: RecipeRequest): Promise<void> {
  await db.requests.put(r);
}

/** The request someone sent you that this recipe answers, if any (its id is the asker's). */
export async function requestAnsweredBy(recipeId: string): Promise<RecipeRequest | undefined> {
  const told = await db.requests.where('fulfilledRecipeId').equals(recipeId).toArray();
  return told.find((r) => r.direction === 'incoming');
}

export async function fulfilRequest(id: string, recipeId: string): Promise<void> {
  await db.requests.update(id, { fulfilledRecipeId: recipeId });
}

function key(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]s\b/g, '')
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .split(/\s+/)
    .filter((w) => w && !['mom', 'mum', 'mama', 'dad', 'nani', 'dadi', 'grandma', 'the', 'a', 'my'].includes(w))
    .join(' ');
}

/** Open requests asked of you whose title matches a recipe title ("Mom's biryani" ~ "Chicken Biryani"). */
export async function findOpenRequestsFor(title: string): Promise<RecipeRequest[]> {
  const t = key(title);
  if (!t) return [];
  const open = (await db.requests.toArray()).filter((r) => r.direction === 'incoming' && !r.fulfilledRecipeId);
  return open.filter((r) => {
    const k = key(r.title);
    return k !== '' && (t.includes(k) || k.includes(t));
  });
}
