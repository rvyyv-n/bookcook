import { useEffect, type ReactNode } from 'react';
import { RouterProvider as AriaRouterProvider } from 'react-aria-components';
import { useHref, useNavigate, type NavigateOptions } from 'react-router';
import { useSettings } from '../db/hooks';
import { applyAppearance } from '../design/skin';
import { matchSystemBars } from '../lib/platform/systemBars';
import { ToastProvider } from '../ui/Toast';
import { SpeechProvider } from './speech';
import { usePrefersDark } from './useMediaQuery';

declare module 'react-aria-components' {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

/** Writes the appearance settings onto <html> (data-skin, data-theme, …) so tokens.css can react. */
function Appearance() {
  const { skin, theme, accent, textSize, spiceColours, stepPhoto, lang } = useSettings();
  const systemDark = usePrefersDark();
  useEffect(() => {
    const root = document.documentElement;
    applyAppearance({ skin, theme, accent, textSize, spiceColours, stepPhoto }, systemDark, root);
    root.lang = lang;
    matchSystemBars(root.dataset.theme === 'dark');
    // Browser chrome follows the design's paper colour.
    const paper = getComputedStyle(root).getPropertyValue('--paper').trim();
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
      m.content = paper;
      m.removeAttribute('media');
    });
  }, [skin, theme, accent, textSize, spiceColours, stepPhoto, systemDark, lang]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <AriaRouterProvider navigate={navigate} useHref={useHref}>
      <SpeechProvider>
        <ToastProvider>
          <Appearance />
          {children}
        </ToastProvider>
      </SpeechProvider>
    </AriaRouterProvider>
  );
}
