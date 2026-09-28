import { beforeEach, describe, expect, it } from 'vitest';
import { createDraft } from '../../db/drafts';
import { resetDatabase } from '../../db/db';
import { saveRecipe } from '../../db/recipes';
import { getSetting, setSetting } from '../../db/settings';
import { firstRunLoader, shouldOnboard } from './firstRun';

describe('shouldOnboard', () => {
  it('shows the welcome to a new cookbook', () => {
    expect(shouldOnboard(false, 0, 0)).toBe('welcome');
  });
  it('marks a cookbook that already has recipes or drafts, without showing anything', () => {
    expect(shouldOnboard(false, 3, 0)).toBe('mark');
    expect(shouldOnboard(false, 0, 1)).toBe('mark');
  });
  it('does nothing once seen', () => {
    expect(shouldOnboard(true, 0, 0)).toBe('none');
    expect(shouldOnboard(true, 5, 2)).toBe('none');
  });
});

describe('firstRunLoader', () => {
  beforeEach(resetDatabase);

  it('redirects a new cookbook to /welcome', async () => {
    const res = await firstRunLoader();
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(302);
    expect((res as Response).headers.get('Location')).toBe('/welcome');
  });

  it('marks an existing cookbook as seen and shows the cookbook', async () => {
    await saveRecipe({ title: 'Dal' });
    expect(await firstRunLoader()).toBeNull();
    expect(await getSetting('onboarded')).toBe(true);
  });

  it('leaves a cookbook that has seen it alone', async () => {
    await setSetting('onboarded', true);
    expect(await firstRunLoader()).toBeNull();
  });

  it('counts a draft as use', async () => {
    await createDraft('type');
    expect(await firstRunLoader()).toBeNull();
    expect(await getSetting('onboarded')).toBe(true);
  });
});
