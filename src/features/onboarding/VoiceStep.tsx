import type { Ref } from 'react';
import { useSpeaker } from '../../app/speech';
import { useSettings } from '../../db/hooks';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { FeatureList, FeatureRow, OnboardingHeading } from '../../ui/Onboarding';

/** Step 2: what voice does, in three rows, and Hear it so the voice can be judged before it's relied on. */
export function VoiceStep({ heading }: { heading: Ref<HTMLHeadingElement> }) {
  const t = useT();
  const o = t.ui.onboarding;
  const { spiceColours } = useSettings();
  const speaker = useSpeaker();
  const group = (n: number) => (spiceColours ? n : undefined);
  return (
    <>
      <OnboardingHeading ref={heading} size="2xl">
        {o.voiceTitle}
      </OnboardingHeading>
      <FeatureList>
        <FeatureRow icon="mic" title={o.voiceTell} body={o.voiceTellBody} spiceGroup={group(1)} />
        <FeatureRow icon="startCooking" title={o.voiceCook} body={o.voiceCookBody} spiceGroup={group(2)} />
        <FeatureRow icon="keyboard" title={o.voiceType} body={o.voiceTypeBody} spiceGroup={group(3)} />
      </FeatureList>
      {speaker.canSpeak && (
        <Button
          variant="secondary"
          icon={speaker.speaking ? 'stop' : 'read'}
          aria-pressed={speaker.speaking}
          onPress={() => (speaker.speaking ? speaker.cancel() : void speaker.speak(t.ui.settings.textPreview))}
          className="w-fit"
        >
          {speaker.speaking ? t.ui.common.stop : o.hearIt}
        </Button>
      )}
    </>
  );
}
