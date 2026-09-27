import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import {
  Button as AriaButton,
  FieldError,
  Input,
  Label,
  SearchField as AriaSearchField,
  Text,
  TextArea,
  TextField as AriaTextField,
  type SearchFieldProps,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components';
import { useT } from '../i18n';
import { cx } from './cx';
import { useDictation } from './dictation';
import { Icon } from './Icon';

/**
 * The field box. Its border is an inset shadow so focus and error don't shift the layout, and its
 * radius is capped because the Tin skins make --radius-md a pill.
 */
export const fieldBoxClass =
  'relative flex min-h-16 rounded-[min(var(--radius-md),18px)] bg-surface text-ink shadow-[inset_0_0_0_1.5px_var(--line-control)] ' +
  'transition-shadow duration-(--dur) focus-within:shadow-[inset_0_0_0_2px_var(--ink)] ' +
  'has-[[data-focus-visible]]:outline-3 has-[[data-focus-visible]]:outline-offset-3 has-[[data-focus-visible]]:outline-focus';

const fieldBoxInvalid = 'shadow-[inset_0_0_0_2px_var(--danger)] focus-within:shadow-[inset_0_0_0_2px_var(--danger)]';
const fieldBoxSpeaking = 'shadow-[inset_0_0_0_2px_var(--accent-mark)] focus-within:shadow-[inset_0_0_0_2px_var(--accent-mark)]';
const fieldBoxDisabled = 'bg-sunk text-ink-muted shadow-[inset_0_0_0_1px_var(--line)]';

const inputBase =
  'min-w-0 flex-1 bg-transparent px-[0.7778rem] text-base text-inherit outline-none placeholder:text-ink-muted data-[disabled]:cursor-not-allowed';

export interface TextFieldProps extends Omit<AriaTextFieldProps, 'children' | 'className'> {
  label: ReactNode;
  description?: ReactNode;
  errorMessage?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  inputClassName?: string;
  labelHidden?: boolean;
  /** Show the Speak button inside the field (when speech is available and the field is controlled). */
  dictate?: boolean;
  inputRef?: Ref<HTMLInputElement & HTMLTextAreaElement>;
}

/** The Speak button and its listening state. Final words are appended to the field's value. */
function useSpeak(value: string | undefined, onChange: ((v: string) => void) | undefined) {
  const dictation = useDictation();
  const [session, setSession] = useState<{ stop(): void } | null>(null);
  const [partial, setPartial] = useState('');
  const latest = useRef(value ?? '');
  const live = useRef(session);
  useEffect(() => {
    latest.current = value ?? '';
    live.current = session;
  });
  // Stop listening if the field goes away mid-sentence.
  useEffect(() => () => live.current?.stop(), []);

  const available = !!dictation && value !== undefined && !!onChange;
  function toggle() {
    if (session) {
      session.stop();
      return;
    }
    if (!dictation || !onChange) return;
    setSession(
      dictation.listen({
        onPartial: setPartial,
        onFinal: (text) => {
          setPartial('');
          const before = latest.current;
          onChange(before && text ? `${before.trimEnd()} ${text.trim()}` : before || text.trim());
        },
        onEnd: () => {
          setPartial('');
          setSession(null);
        },
      }),
    );
  }
  return { available, speaking: !!session, partial, toggle };
}

function SpeakButton({ speaking, onPress, isDisabled }: { speaking: boolean; onPress: () => void; isDisabled?: boolean }) {
  const t = useT();
  return (
    <AriaButton
      onPress={onPress}
      isDisabled={isDisabled}
      aria-pressed={speaking}
      className={cx(
        'flex min-h-16 min-w-16 shrink-0 flex-col items-center justify-center self-stretch rounded-[min(var(--radius-md),18px)] text-[0.6667rem] leading-tight font-bold',
        'data-[hovered]:bg-sunk',
        speaking ? 'text-accent-text' : 'text-ink',
      )}
    >
      <Icon name={speaking ? 'stop' : 'mic'} size="1.3rem" filled={speaking} />
      {speaking ? t.ui.common.stop : t.ui.common.speak}
    </AriaButton>
  );
}

/** A labelled text field. The label always sits above the field, never as the placeholder. */
export function TextField({
  label,
  description,
  errorMessage,
  placeholder,
  multiline,
  rows = 3,
  className,
  inputClassName,
  labelHidden,
  dictate = true,
  inputRef,
  ...rest
}: TextFieldProps) {
  const speak = useSpeak(rest.value, rest.onChange);
  const showSpeak = dictate && speak.available;
  return (
    <AriaTextField {...rest} className={cx('group flex flex-col gap-1.5', className)}>
      <Label className={cx('font-bold text-ink group-data-[disabled]:text-ink-muted', labelHidden && 'sr-only')}>{label}</Label>
      <div
        className={cx(
          fieldBoxClass,
          multiline ? 'items-start' : 'items-center',
          rest.isInvalid && fieldBoxInvalid,
          speak.speaking && fieldBoxSpeaking,
          rest.isDisabled && fieldBoxDisabled,
        )}
      >
        {multiline ? (
          <TextArea
            ref={inputRef}
            rows={rows}
            placeholder={placeholder}
            className={cx(inputBase, 'resize-y self-stretch py-3', inputClassName)}
          />
        ) : (
          <Input ref={inputRef} placeholder={placeholder} className={cx(inputBase, 'self-stretch', inputClassName)} />
        )}
        {showSpeak && <SpeakButton speaking={speak.speaking} onPress={speak.toggle} isDisabled={rest.isDisabled} />}
      </div>
      {speak.partial && (
        <p aria-live="polite" className="text-ink-muted">
          {speak.partial}
        </p>
      )}
      {description && (
        <Text slot="description" className="text-ink-muted">
          {description}
        </Text>
      )}
      <FieldError className="flex items-center gap-1.5 font-bold text-danger">
        <Icon name="checkThis" size="1.2rem" className="shrink-0" />
        {errorMessage}
      </FieldError>
    </AriaTextField>
  );
}

/**
 * The recipe search. Speak sits at the right when speech is available; once there's text, Clear takes
 * its place. `shortcut` shows the key that focuses it (desktop). `compact` is the 56px desktop size.
 */
export function SearchField({
  label,
  placeholder,
  className,
  shortcut,
  compact = false,
  value,
  onChange,
  ...rest
}: {
  label: string;
  placeholder?: string;
  className?: string;
  shortcut?: string;
  compact?: boolean;
  value: string;
  onChange: (v: string) => void;
} & Omit<SearchFieldProps, 'className' | 'value' | 'onChange'>) {
  const t = useT();
  const speak = useSpeak(value, onChange);
  const side = 'flex min-w-16 shrink-0 flex-col items-center justify-center self-stretch text-[0.6667rem] leading-tight font-bold';
  return (
    <AriaSearchField {...rest} value={value} onChange={onChange} className={cx('group', className)}>
      <Label className="sr-only">{label}</Label>
      <div className={cx(fieldBoxClass, 'items-center', compact && 'min-h-13!', speak.speaking && fieldBoxSpeaking)}>
        <Icon name="search" className="pointer-events-none ml-[0.7778rem] shrink-0 text-ink-muted group-focus-within:text-ink" />
        <Input
          placeholder={placeholder}
          className={cx(inputBase, 'self-stretch [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden')}
        />
        {value ? (
          <AriaButton className={cx(side, 'rounded-[min(var(--radius-md),18px)] text-ink data-[hovered]:bg-sunk')}>
            <Icon name="close" size="1.3rem" />
            {t.ui.common.clear}
          </AriaButton>
        ) : speak.available ? (
          <SpeakButton speaking={speak.speaking} onPress={speak.toggle} />
        ) : shortcut ? (
          <kbd aria-hidden className="mr-3 font-[inherit] text-sm font-bold text-ink-muted">
            {shortcut}
          </kbd>
        ) : null}
      </div>
      {speak.partial && (
        <p aria-live="polite" className="mt-1.5 text-ink-muted">
          {speak.partial}
        </p>
      )}
    </AriaSearchField>
  );
}
