import { useT } from '../../i18n';
import { isNative } from '../../lib/platform/isNative';

/**
 * The words for a blocked or missing microphone. The browser and the Android app fail for
 * different reasons and fix them in different places, so each gets its own.
 */
export function useMicCopy() {
  const c = useT().ui.capture;
  const native = isNative();
  return {
    blockedSteps: native ? c.blockedStepsNative : c.blockedSteps,
    noSpeechTitle: native ? c.noSpeechTitleNative : c.noSpeechTitle,
    noSpeechBody: native ? c.noSpeechBodyNative : c.noSpeechBody,
  };
}
