import { useEffect, type ReactNode } from 'react';
import { RouterProvider as AriaRouterProvider } from 'react-aria-components';
import { useHref, useNavigate, type NavigateOptions } from 'react-router';
import { useSettings } from '../db/hooks';
import { ToastProvider } from '../ui/Toast';
import { usePrefersDark } from './useMediaQuery';

declare module 'react-aria-components' {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

/** Applies text size and theme to <html> so tokens.css can react. */
function Appearance() {
  const { textSize, theme, lang } = useSettings();
  const prefersDark = usePrefersDark();
  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.textSize = textSize;
    root.dataset.theme = resolved;
    root.lang = lang;
    // Browser chrome follows the design's paper colour.
    const paper = getComputedStyle(root).getPropertyValue('--paper').trim();
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
      m.content = paper;
      m.removeAttribute('media');
    });
  }, [textSize, resolved, lang]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <AriaRouterProvider navigate={navigate} useHref={useHref}>
      <ToastProvider>
        <Appearance />
        {children}
      </ToastProvider>
    </AriaRouterProvider>
  );
}
