import { describe, expect, it, vi } from 'vitest';
import { micState, requestMic, type MicEnv } from './micPermission';

function env(over: Partial<MicEnv> & { query?: () => Promise<{ state: string }>; getUserMedia?: () => Promise<unknown> } = {}): MicEnv {
  const { query, getUserMedia, ...rest } = over;
  return {
    supported: true,
    native: false,
    plugin: {
      checkPermissions: vi.fn(async () => ({ speechRecognition: 'prompt' })),
      requestPermissions: vi.fn(async () => ({ speechRecognition: 'granted' })),
    } as never,
    nav: {
      permissions: { query: query ?? (async () => ({ state: 'prompt' })) },
      mediaDevices: { getUserMedia: getUserMedia ?? (async () => ({ getTracks: () => [] })) },
    } as never,
    ...rest,
  };
}

describe('micState', () => {
  it('is unsupported without speech', async () => {
    expect(await micState(env({ supported: false }))).toBe('unsupported');
  });
  it.each(['granted', 'denied', 'prompt'])('reads the web permission: %s', async (state) => {
    expect(await micState(env({ query: async () => ({ state }) }))).toBe(state);
  });
  it('asks on browsers that cannot say (Firefox)', async () => {
    const query = async () => {
      throw new TypeError('not a valid permission name');
    };
    expect(await micState(env({ query }))).toBe('prompt');
  });
  it('uses the plugin on native', async () => {
    const plugin = { checkPermissions: vi.fn(async () => ({ speechRecognition: 'denied' })), requestPermissions: vi.fn() } as never;
    expect(await micState(env({ native: true, plugin }))).toBe('denied');
  });
});

describe('requestMic', () => {
  it('opens the mic and stops the tracks at once', async () => {
    const stop = vi.fn();
    const getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop }, { stop }] }));
    expect(await requestMic(env({ getUserMedia }))).toBe('granted');
    expect(stop).toHaveBeenCalledTimes(2);
  });
  it('is denied when the user refuses', async () => {
    const getUserMedia = async () => {
      throw new DOMException('no', 'NotAllowedError');
    };
    expect(await requestMic(env({ getUserMedia }))).toBe('denied');
  });
  it('is denied when there is no microphone', async () => {
    const getUserMedia = async () => {
      throw new DOMException('none', 'NotFoundError');
    };
    expect(await requestMic(env({ getUserMedia }))).toBe('denied');
  });
  it('asks the plugin on native', async () => {
    const plugin = { checkPermissions: vi.fn(), requestPermissions: vi.fn(async () => ({ speechRecognition: 'granted' })) } as never;
    expect(await requestMic(env({ native: true, plugin }))).toBe('granted');
  });
  it('is unsupported without speech', async () => {
    expect(await requestMic(env({ supported: false }))).toBe('unsupported');
  });
});
