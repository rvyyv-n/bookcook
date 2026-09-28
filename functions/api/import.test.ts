import { describe, expect, it } from 'vitest';
import { allowedUrl, importRecipe } from './import';

const page = `<html><head><script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Recipe',
  name: 'Chicken biryani',
  recipeYield: '6 servings',
  recipeIngredient: ['1 kg chicken', '3 cups basmati rice'],
  recipeInstructions: [{ '@type': 'HowToStep', text: 'Boil the rice for 7 minutes.' }],
})}</script></head><body></body></html>`;

const site = (body: string, init: ResponseInit = {}) =>
  (async () => new Response(body, { headers: { 'content-type': 'text/html' }, ...init })) as unknown as typeof fetch;

describe('From a link: the import function', () => {
  it('only fetches public web pages', () => {
    expect(allowedUrl('recipesite.com/chicken-biryani')?.toString()).toBe('https://recipesite.com/chicken-biryani');
    for (const bad of [
      null,
      '',
      'file:///etc/passwd',
      'http://localhost:8080',
      'http://192.168.1.1/',
      'http://10.0.0.2',
      'http://[::1]/',
      'intranet',
    ])
      expect(allowedUrl(bad)).toBeUndefined();
  });

  it('returns the recipe on the page', async () => {
    const res = await importRecipe('https://recipesite.com/biryani', site(page));
    expect(res.status).toBe(200);
    const { recipe } = (await res.json()) as { recipe: { title: string; servings: number; ingredients: unknown[]; sourceUrl: string } };
    expect(recipe).toMatchObject({ title: 'Chicken biryani', servings: 6, sourceUrl: 'https://recipesite.com/biryani' });
    expect(recipe.ingredients).toHaveLength(2);
  });

  it('says why it failed', async () => {
    const error = async (res: Response) => ((await res.json()) as { error: string }).error;
    expect(await error(await importRecipe('not a url at all', site(page)))).toBe('badUrl');
    expect(await error(await importRecipe('https://a.com', site('<html>No recipe here</html>')))).toBe('noRecipe');
    expect(await error(await importRecipe('https://a.com', site('', { status: 404 })))).toBe('unreachable');
    const down = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    expect(await error(await importRecipe('https://a.com', down))).toBe('unreachable');
  });
});
