import { describe, expect, it } from 'vitest';
import { readRequestLink, requestLink } from './shareLink';

describe('request links', () => {
  it('round-trips a request, accents and quotes included', () => {
    const link = requestLink(
      { id: 'r1', title: 'Nani’s nihari', from: 'Rayyan', note: 'The one from “Eid” 🍲' },
      'https://x.dev',
      '/bookcook/',
    );
    expect(link.startsWith('https://x.dev/bookcook/import#request=')).toBe(true);
    expect(readRequestLink(new URL(link).hash)).toEqual({
      id: 'r1',
      title: 'Nani’s nihari',
      from: 'Rayyan',
      note: 'The one from “Eid” 🍲',
    });
  });

  it('leaves out what was not given', () => {
    const link = requestLink({ id: 'r2', title: 'Karahi' }, 'https://x.dev', '/');
    expect(readRequestLink(new URL(link).hash)).toEqual({ id: 'r2', title: 'Karahi', from: undefined, note: undefined });
  });

  it('rejects a missing, cut-short or empty fragment', () => {
    expect(readRequestLink('')).toBeUndefined();
    expect(readRequestLink('#request=eyJpIjoi')).toBeUndefined();
    expect(readRequestLink('#request=' + btoa('{"i":"x","t":"  "}'))).toBeUndefined();
  });
});
