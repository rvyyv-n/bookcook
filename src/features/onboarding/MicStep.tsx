import { useCallback, useEffect, useState, type Ref } from 'react';
import { useT } from '../../i18n';
import { isNative } from '../../lib/platform/isNative';
import { useMicCopy } from '../capture/micCopy';
import { micState, requestMic, type MicState } from '../../lib/platform/micPermission';
import { OnboardingHeading, StatusDisc, StepsCard } from '../../ui/Onboarding';

/**
 * Where the microphone stands, checked when the step opens (someone who already allowed it isn't
 * asked again). `announce` holds the result of asking, for the `role="status"` region.
 */
export function useMic(active: boolean) {
  const t = useT();
  const [state, setState] = useState<MicState | null>(null);
  const [busy, setBusy] = useState(false);
  const [announce, setAnnounce] = useState('');

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void micState().then((s) => !cancelled && setState(s));
    return () => {
      cancelled = true;
    };
  }, [active]);

  const settle = useCallback(
    (s: MicState) => {
      setState(s);
      setAnnounce(s === 'granted' ? t.ui.onboarding.micGranted : s === 'denied' ? t.ui.capture.blocked : '');
    },
    [t],
  );
  /** Ask: the system dialog. */
  const allow = useCallback(async () => {
    setBusy(true);
    settle(await requestMic());
    setBusy(false);
  }, [settle]);
  /** The web can't show a dismissed prompt again, so this re-reads a change made in site settings. */
  const retry = useCallback(async () => {
    setBusy(true);
    settle(await micState());
    setBusy(false);
  }, [settle]);

  return { state, busy, announce, allow, retry };
}
export type Mic = ReturnType<typeof useMic>;

/** Step 3: ask for the microphone, or say where it stands: allowed, blocked, or not possible here. */
export function MicStep({ heading, mic }: { heading: Ref<HTMLHeadingElement>; mic: Mic }) {
  const t = useT();
  const o = t.ui.onboarding;
  const micCopy = useMicCopy();
  const native = isNative();
  const { state } = mic;
  const denied = state === 'denied';
  const unsupported = state === 'unsupported';
  const granted = state === 'granted';
  const title = granted ? o.micGranted : denied ? t.ui.capture.blocked : unsupported ? micCopy.noSpeechTitle : o.micTitle;
  const body = granted
    ? o.micGrantedBody
    : denied
      ? o.micDeniedBody
      : unsupported
        ? native
          ? o.micUnsupportedBodyNative
          : o.micUnsupportedBody
        : o.micBody;
  return (
    <>
      {state && (
        <StatusDisc
          icon={granted ? 'check' : denied ? 'micOff' : unsupported ? 'keyboard' : 'mic'}
          tone={granted ? 'success' : denied ? 'blocked' : unsupported ? 'sunk' : 'accent'}
        />
      )}
      <div className="flex flex-col gap-3">
        <OnboardingHeading ref={heading} size="2xl">
          {title}
        </OnboardingHeading>
        {state && <p className="text-lg text-pretty">{body}</p>}
      </div>
      {denied && <StepsCard steps={micCopy.blockedSteps} />}
      <p role="status" className="sr-only">
        {mic.announce}
      </p>
    </>
  );
}
