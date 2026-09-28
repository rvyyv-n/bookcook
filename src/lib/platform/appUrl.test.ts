import { afterEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({ value: false }));
vi.mock('./isNative', () => ({ isNative: () => native.value }));

import { appLinkBase } from './appUrl';

afterEach(() => {
  native.value = false;
  vi.unstubAllEnvs();
});

describe('appLinkBase', () => {
  it('uses this page in the browser', () => {
    expect(appLinkBase()).toEqual({ origin: location.origin, base: import.meta.env.BASE_URL });
  });

  it('uses the published address in the app, where the page origin is only local', () => {
    native.value = true;
    expect(appLinkBase()).toEqual({ origin: 'https://rvyyv-n.github.io', base: '/bookcook/' });
  });

  it('lets a build override the published address', () => {
    native.value = true;
    vi.stubEnv('VITE_PUBLIC_URL', 'https://example.org/cook/');
    expect(appLinkBase()).toEqual({ origin: 'https://example.org', base: '/cook/' });
  });
});
