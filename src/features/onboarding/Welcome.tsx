import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useIsDesktop } from '../../app/useMediaQuery';
import { useSettings } from '../../db/hooks';
import { setSetting } from '../../db/settings';
import { skinConfig } from '../../design/skin';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { StepBar, StepNumeral } from '../../ui/Cook';
import { Logo } from '../../ui/Logo';
import { OnboardingFrame, OnboardingHeading, OnboardingProgress, Wordmark } from '../../ui/Onboarding';
import { RestoreButton, useRestore } from '../settings/Backup';
import { VoiceStep } from './VoiceStep';
import { TextSizeSegmented } from '../settings/TextSizeSegmented';

const STEPS = ['welcome', 'voice', 'mic'] as const;
type StepId = (typeof STEPS)[number];

/**
 * First-run welcome at /welcome: text size, what voice does, and the microphone. The step is in the
 * URL (?step=voice), so Back and a reload stay on it. `?from=settings` is the Settings row that
 * shows it again: leaving goes back to Settings and doesn't touch `onboarded`.
 */
export function WelcomePage() {
  const t = useT();
  const o = t.ui.onboarding;
  const { skin } = useSettings();
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const from = params.get('from') === 'settings';
  const index = Math.max(0, STEPS.indexOf(params.get('step') as StepId));
  const step = STEPS[index];
  const config = skinConfig[skin];
  const heading = useRef<HTMLHeadingElement>(null);

  const url = (i: number) => {
    const q = new URLSearchParams();
    if (i > 0) q.set('step', STEPS[i] ?? STEPS[0]);
    if (from) q.set('from', 'settings');
    return { search: q.size ? `?${q}` : '' };
  };
  const next = () => navigate(url(index + 1));
  // Back goes to the step before it in history; a page opened on a later step has none, so it steps back in place.
  const back = () => (location.key === 'default' ? navigate(url(index - 1), { replace: true }) : navigate(-1));
  const leave = () => {
    if (!from) void setSetting('onboarded', true);
    navigate(from ? '/settings' : '/', { replace: true });
  };
  const restore = useRestore(leave);

  useEffect(() => heading.current?.focus(), [index]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A sheet (the restore choice) takes Escape for itself.
      if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('[role="dialog"]')) leave();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const label = o.stepOf(index + 1, STEPS.length);
  const numeral = config.stepHeader === 'numeral';
  const primary =
    step !== 'mic' ? (
      <Button variant="primary" size="XL" iconEnd="next" onPress={next} className={desktop ? undefined : 'w-full'}>
        {o.next}
      </Button>
    ) : null;
  const hint = desktop && index < STEPS.length - 1 && <span className="text-[0.8333rem] text-ink-muted">{o.skipHint}</span>;

  let body: ReactNode = null;
  if (step === 'welcome')
    body = (
      <>
        <Logo variant="rice" className="size-[4.4444rem] shrink-0 dark:hidden" />
        <Logo variant="dark" className="hidden size-[4.4444rem] shrink-0 dark:block" />
        <div className="flex flex-col gap-3">
          <p className="type-eyebrow text-lg text-accent-text">{o.welcomeEyebrow}</p>
          <OnboardingHeading ref={heading}>{o.welcomeTitle}</OnboardingHeading>
          <p className="text-lg text-pretty">{o.welcomeBody}</p>
        </div>
        <div className="flex w-full flex-col gap-2.5">
          <TextSizeSegmented label={o.textSizeLabel} labelHidden={false} />
          <p className="text-ink-muted">{o.textSizeHint}</p>
        </div>
        <RestoreButton restore={restore} variant="quiet" icon="download" className="w-fit">
          {o.restore}
        </RestoreButton>
        {restore.sheet}
      </>
    );

  if (step === 'voice') body = <VoiceStep heading={heading} />;

  return (
    <OnboardingFrame
      desktop={desktop}
      wide={step === 'voice'}
      field={config.cookSurface === 'field'}
      centre={config.detailAlign === 'center'}
      left={
        desktop ? (
          <Wordmark name={t.ui.appName} />
        ) : index > 0 ? (
          <Button variant="quiet" icon="back" onPress={back} className="px-[.8rem]">
            {t.ui.common.back}
          </Button>
        ) : null
      }
      centreSlot={
        numeral ? (
          <StepNumeral current={index} total={STEPS.length} of={t.ui.cook.of(STEPS.length)} label={label} as="div" />
        ) : (
          <OnboardingProgress label={label} bar={<StepBar current={index} total={STEPS.length} className="w-28" />} />
        )
      }
      right={
        step !== 'mic' && (
          <Button variant="quiet" onPress={leave}>
            {o.skip}
          </Button>
        )
      }
      primary={
        <>
          {desktop && index > 0 && (
            <Button variant="quiet" icon="back" onPress={back}>
              {t.ui.common.back}
            </Button>
          )}
          {primary}
          {hint}
        </>
      }
    >
      {body}
    </OnboardingFrame>
  );
}
