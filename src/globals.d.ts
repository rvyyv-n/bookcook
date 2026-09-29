/** The app's version from package.json, set at build time (vite.config.ts `define`). */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Set only for the old GitHub Pages copy: the address Bookcook has moved to (see src/app/moved.tsx). */
  readonly VITE_MOVED_TO?: string;
}
