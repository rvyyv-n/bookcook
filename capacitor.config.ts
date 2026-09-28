import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.rvyyvn.bookcook',
  appName: 'Bookcook',
  webDir: 'dist',
  android: { backgroundColor: '#FBF7F0' },
  // index.html asks for viewport-fit=cover; saying so up front saves a layout jump on start.
  plugins: { SystemBars: { initialViewportFitValueHint: 'cover' } },
};

export default config;
