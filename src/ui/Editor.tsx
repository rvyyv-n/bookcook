import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import {
  Button as AriaButton,
  FileTrigger,
  Label,
  Menu,
  MenuItem,
  Popover,
  Tab,
  TabList,
  TextField as AriaTextField,
} from 'react-aria-components';
import { Button } from './Button';
import { mentionClass } from './Cook';
import { cx } from './cx';
import { AutoSizeInput } from './Field';
import { Icon, type IconName } from './Icon';
import { Photo } from './Photo';

export { TabPanel, Tabs } from 'react-aria-components';

const fieldRadius = 'rounded-[min(var(--radius-md),18px)]';
const outlined =
  'inline-flex min-h-[3.5rem] items-center gap-1.5 rounded-md pr-[1rem] pl-[.7rem] font-bold text-ink shadow-[inset_0_0_0_1.5px_var(--line-strong)] ' +
  'transition-[background-color,transform] duration-(--dur) data-[hovered]:bg-sunk data-[pressed]:scale-[.97]';

/** "Draft saved" (cloud_done in the success colour), or "Saving…" while a change is on its way. */
export function SavedIndicator({ saving, label }: { saving: boolean; label: string }) {
  return (
    <span role="status" className="flex items-center gap-1.5 text-ink-muted">
      {/* Keyed, so "Saving…" and "Draft saved" fade in place of each other. */}
      <span key={saving ? 'saving' : 'saved'} className="flex animate-fade-in items-center gap-1.5">
        <Icon name={saving ? 'backup' : 'saved'} size="1.2rem" className={cx('shrink-0', !saving && 'text-success')} />
        {label}
      </span>
    </span>
  );
}

/** The editor's numbered section pills: 1 Details · 2 Ingredients · 3 Steps · 4 Story. Use inside <Tabs>. */
export function SectionTabs({ label, items }: { label: string; items: { id: string; label: string }[] }) {
  return (
    <TabList aria-label={label} className="flex gap-1.5 overflow-x-auto px-4 pt-3.5 pb-1 [scrollbar-width:none]">
      {items.map((it, i) => (
        <Tab
          key={it.id}
          id={it.id}
          className={cx(
            'group flex min-h-[3.5rem] flex-none cursor-pointer items-center gap-1.5 rounded-full px-[1rem] font-bold text-ink outline-none transition-colors duration-(--dur)',
            'shadow-[inset_0_0_0_1.5px_var(--line-strong)] data-[hovered]:bg-sunk',
            'data-[selected]:bg-ink data-[selected]:text-paper data-[selected]:shadow-none',
            'data-[focus-visible]:outline-3 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-3 data-[focus-visible]:outline-focus',
          )}
        >
          <span className="text-ink-muted tabular-nums group-data-[selected]:text-paper group-data-[selected]:opacity-80">{i + 1}</span>
          {it.label}
        </Tab>
      ))}
    </TabList>
  );
}

/** An outlined L button with its icon: Line, Section, + Step, Add photo. */
export function OutlineButton({
  icon,
  children,
  onPress,
  className,
}: {
  icon: IconName;
  children: ReactNode;
  onPress?: () => void;
  className?: string;
}) {
  return (
    <AriaButton onPress={onPress} className={cx(outlined, className)}>
      <Icon name={icon} className="shrink-0" />
      {children}
    </AriaButton>
  );
}

/** Pick a photo from the camera or the library. */
export function PhotoButton({
  icon = 'addPhoto',
  children,
  onPick,
  className,
  variant = 'outline',
}: {
  icon?: IconName;
  children: ReactNode;
  onPick: (file: File) => void;
  className?: string;
  /** outline: Add photo on a step. lifted: Change, floating on a photo. */
  variant?: 'outline' | 'lifted';
}) {
  return (
    <FileTrigger acceptedFileTypes={['image/*']} onSelect={(files) => files?.[0] && onPick(files[0])}>
      <AriaButton
        className={cx(
          variant === 'outline'
            ? outlined
            : 'inline-flex min-h-[3.5rem] items-center gap-1.5 rounded-md bg-surface pr-[1rem] pl-[.7rem] font-bold text-ink shadow-lift data-[pressed]:scale-[.97]',
          className,
        )}
      >
        <Icon name={icon} className="shrink-0" />
        {children}
      </AriaButton>
    </FileTrigger>
  );
}

/** The recipe photo on the phone Details section: 16:10, with Change (or Add photo) on it. */
export function HeroPhotoPicker({ id, label, onPick }: { id: string | undefined; label: string; onPick: (file: File) => void }) {
  return (
    <div className="relative overflow-hidden rounded-lg">
      <Photo id={id} alt="" className="block aspect-[16/10] w-full" />
      <PhotoButton variant="lifted" icon="camera" onPick={onPick} className="absolute right-2.5 bottom-2.5">
        {label}
      </PhotoButton>
    </div>
  );
}

/** The desktop editor's 200px photo. The photo itself is the button that changes it. */
export function DeskPhotoPicker({ id, label, onPick }: { id: string | undefined; label: string; onPick: (file: File) => void }) {
  return (
    <FileTrigger acceptedFileTypes={['image/*']} onSelect={(files) => files?.[0] && onPick(files[0])}>
      <AriaButton aria-label={label} className="group relative block w-[200px] overflow-hidden rounded-lg">
        <Photo id={id} alt="" className="block aspect-[4/3] w-full" />
        {!id && (
          <span className="absolute inset-0 flex items-center justify-center gap-1.5 font-bold text-ink">
            <Icon name="addPhoto" className="shrink-0" />
            {label}
          </span>
        )}
        <span
          aria-hidden
          className="absolute inset-0 transition-colors duration-(--dur) group-data-[hovered]:bg-[rgb(var(--shadow-color)/.12)]"
        />
      </AriaButton>
    </FileTrigger>
  );
}

// Ingredient lines

export interface LineParts {
  quantity: string;
  unit: string;
  name: string;
  note: string;
}

/** The live parse under the focused line: **3** · **cups** · basmati rice · *washed and soaked*. */
function ParsePreview({ parts }: { parts: LineParts }) {
  const bits: ReactNode[] = [];
  if (parts.quantity)
    bits.push(
      <b key="q" className="text-ink">
        {parts.quantity}
      </b>,
    );
  if (parts.unit)
    bits.push(
      <b key="u" className="text-ink">
        {parts.unit}
      </b>,
    );
  if (parts.name)
    bits.push(
      <span key="n" className="text-ink">
        {parts.name}
      </span>,
    );
  if (parts.note) bits.push(<i key="o">{parts.note}</i>);
  return (
    <span className="flex animate-fade-in flex-wrap items-center gap-x-2 gap-y-1 text-[0.9375rem] text-ink-muted">
      {bits.flatMap((b, i) =>
        i
          ? [
              <span key={`d${i}`} aria-hidden>
                ·
              </span>,
              b,
            ]
          : [b],
      )}
    </span>
  );
}

/** "Check this · two amounts in one line", under a line the parser was unsure of. */
export function CheckNote({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-1 text-[0.875rem] font-bold text-accent-text">
      <Icon name="checkThis" size="1.1rem" className="shrink-0" />
      {children}
    </span>
  );
}

/**
 * SmartIngredientLine: one typed ingredient. At rest it's a ruled row (or, ending in ":", a section
 * heading); focused, it's a field with the parse preview underneath once typing pauses (300ms), and
 * suggestions hang off it as a listbox (↓ to reach them, Enter to take one, Esc to close them).
 * Every other key is the editor's: Enter for a new line, Backspace on an empty line, ↑ ↓ between lines.
 */
export function IngredientLineField({
  value,
  onChange,
  label,
  placeholder,
  heading = false,
  spiceGroup,
  preview,
  suggestions = [],
  suggestionsLabel,
  onPick,
  onKeyDown,
  onFocus,
  onBlur,
  onPaste,
  inputRef,
  dense = false,
  check,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  /** A section heading ("For the rice:"). */
  heading?: boolean;
  spiceGroup?: number;
  preview?: LineParts;
  suggestions?: string[];
  suggestionsLabel?: string;
  onPick?: (index: number) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onPaste?: (e: ClipboardEvent<HTMLInputElement>) => void;
  inputRef?: Ref<HTMLInputElement>;
  /** The desktop's shorter rows. */
  dense?: boolean;
  /** "Check this · …" under the line. */
  check?: ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [dismissed, setDismissed] = useState(false);
  const [idle, setIdle] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const listId = useId();

  const showList = focused && !dismissed && suggestions.length > 0;
  const showPreview = focused && idle && !showList && !heading && !!preview && !!(preview.name || preview.quantity);

  function change(v: string) {
    setActive(-1);
    setDismissed(false);
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 300);
    onChange(v);
  }

  function keyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (showList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => (a + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp' && active >= 0) {
        e.preventDefault();
        setActive((a) => a - 1);
        return;
      }
      if (e.key === 'Enter' && active >= 0) {
        e.preventDefault();
        onPick?.(active);
        setActive(-1);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setDismissed(true);
        return;
      }
    }
    onKeyDown?.(e);
  }

  const input = (
    <input
      ref={inputRef}
      value={value}
      placeholder={placeholder}
      aria-label={label}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={showList}
      aria-controls={showList ? listId : undefined}
      aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
      autoComplete="off"
      enterKeyHint="next"
      onChange={(e) => change(e.target.value)}
      onKeyDown={keyDown}
      onPaste={onPaste}
      onFocus={() => {
        setFocused(true);
        onFocus?.();
      }}
      onBlur={() => {
        setFocused(false);
        setDismissed(false);
        onBlur?.();
      }}
      className={cx(
        'w-full min-w-0 bg-transparent text-ink outline-none placeholder:font-normal placeholder:text-ink-muted',
        heading &&
          'font-(family-name:--font-display) text-lg font-bold text-(color:--sp-heading) [font-variation-settings:var(--font-display-settings)]',
      )}
    />
  );

  return (
    <div className="relative" data-spice-group={heading ? spiceGroup : undefined}>
      {focused ? (
        <div
          className={cx(
            'flex flex-col bg-surface px-3.5 shadow-[inset_0_0_0_2px_var(--ink)]',
            dense ? 'my-1 gap-1.5 py-2.5' : 'my-1.5 gap-2 py-3',
            showList ? 'rounded-t-[min(var(--radius-md),18px)]' : fieldRadius,
          )}
        >
          {input}
          {showPreview && <ParsePreview parts={preview} />}
          {check}
        </div>
      ) : heading ? (
        <div className={cx('flex items-center gap-2.5', dense ? 'pt-2 pb-1' : 'pt-2.5 pb-1.5')}>
          <span aria-hidden className="size-3 shrink-0 rounded-full bg-(--sp) [display:var(--sp-show)]" />
          <span className="min-w-0 flex-1">{input}</span>
          <span aria-hidden className="h-px flex-1 bg-(--sp) [display:var(--sp-rule)]" />
        </div>
      ) : (
        <div
          className={cx('flex flex-col justify-center gap-1 border-b border-line', dense ? 'min-h-[3.5rem] py-1.5' : 'min-h-[3.5rem] py-2')}
        >
          {input}
          {check}
        </div>
      )}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={suggestionsLabel}
          className="absolute inset-x-0 top-full z-20 -mt-1.5 flex flex-col overflow-hidden rounded-b-[min(var(--radius-md),18px)] bg-surface shadow-[var(--shadow-lift),inset_0_0_0_1px_var(--line)]"
        >
          {suggestions.map((s, i) => (
            <li
              key={s}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick?.(i)}
              className={cx(
                'flex min-h-[3.5rem] cursor-pointer items-center px-3.5',
                i > 0 && 'border-t border-line',
                i === active ? 'bg-accent-soft font-bold' : 'hover:bg-sunk',
              )}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Steps

export interface StepPart {
  text: string;
  mention?: { spiceGroup?: number };
  /** A duration found in the text, shown as a chip ("30 min"). */
  timer?: string;
}

/** Step text with its mentions and timer chips, as found while typing. */
export function StepRichText({ parts }: { parts: StepPart[] }) {
  return parts.map((p, i) =>
    p.timer ? (
      <b key={i} className="inline-flex items-center gap-[3px] rounded-sm bg-sunk px-[.35em] whitespace-nowrap">
        <Icon name="timer" size="1.1rem" className="shrink-0" />
        {p.timer}
      </b>
    ) : p.mention ? (
      <span key={i} data-spice-group={p.mention.spiceGroup} className={mentionClass}>
        {p.text}
      </span>
    ) : (
      <span key={i}>{p.text}</span>
    ),
  );
}

/** A textarea that grows with its text. */
export function GrowingTextArea({
  value,
  onChange,
  label,
  placeholder,
  onKeyDown,
  onBlur,
  onFocus,
  textRef,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  textRef?: (el: HTMLTextAreaElement | null) => void;
  className?: string;
}) {
  const own = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = own.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={(el) => {
        own.current = el;
        textRef?.(el);
      }}
      rows={1}
      value={value}
      aria-label={label}
      placeholder={placeholder}
      enterKeyHint="next"
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      onFocus={onFocus}
      className={cx(
        'block w-full resize-none overflow-hidden bg-surface px-3 py-2 text-ink outline-none placeholder:text-ink-muted',
        fieldRadius,
        'shadow-[inset_0_0_0_2px_var(--ink)]',
        className,
      )}
    />
  );
}

/**
 * The Move handle: drag it to reorder, or tap it (or press Enter) for Up and Down. The two always go
 * together, so no one has to drag.
 */
export function MoveHandle({
  label,
  word,
  upLabel,
  downLabel,
  canUp,
  canDown,
  onUp,
  onDown,
  dragProps,
  wasTap,
  buttonRef,
}: {
  /** "Move step 2" */
  label: string;
  /** "Move", under the icon. */
  word: string;
  upLabel: string;
  downLabel: string;
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
  dragProps: {
    onPointerDown: (e: PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: PointerEvent<HTMLElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    style: CSSProperties;
  };
  wasTap: () => boolean;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <button
        type="button"
        ref={(el) => {
          trigger.current = el;
          buttonRef?.(el);
        }}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        {...dragProps}
        onClick={() => wasTap() && setOpen(true)}
        className="flex min-h-[3.5rem] min-w-[3.5rem] cursor-grab flex-col items-center justify-center rounded-md text-[0.875rem] leading-tight font-bold text-ink-muted transition-colors duration-(--dur) select-none hover:bg-sunk active:cursor-grabbing"
      >
        <Icon name="drag" className="shrink-0" />
        {word}
      </button>
      <Popover
        triggerRef={trigger}
        isOpen={open}
        onOpenChange={setOpen}
        placement="bottom start"
        className="min-w-44 rounded-[min(var(--radius-md),18px)] bg-surface p-1.5 shadow-lift outline-none data-[entering]:animate-rise data-[exiting]:animate-fade-out"
      >
        <Menu
          aria-label={label}
          autoFocus="first"
          disabledKeys={[...(canUp ? [] : ['up']), ...(canDown ? [] : ['down'])]}
          onAction={(key) => {
            setOpen(false);
            if (key === 'up') onUp();
            else onDown();
          }}
          className="flex flex-col outline-none"
        >
          {(
            [
              ['up', 'up', upLabel],
              ['down', 'down', downLabel],
            ] as const
          ).map(([id, icon, text]) => (
            <MenuItem
              key={id}
              id={id}
              className="flex min-h-[3.5rem] cursor-pointer items-center gap-3 rounded-sm px-3 font-bold text-ink outline-none data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-muted data-[focused]:bg-sunk data-[focus-visible]:outline-3 data-[focus-visible]:outline-solid data-[focus-visible]:outline-focus data-[focus-visible]:-outline-offset-3"
            >
              <Icon name={icon} className="shrink-0" />
              {text}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </>
  );
}

/** One step in the editor: Move, the numeral, then the text and its photo. */
export function StepRow({
  numeral,
  move,
  children,
  dense = false,
  rowRef,
  style,
  lifted = false,
}: {
  numeral: number;
  move: ReactNode;
  children: ReactNode;
  dense?: boolean;
  rowRef?: (el: HTMLElement | null) => void;
  style?: CSSProperties;
  /** Being dragged. */
  lifted?: boolean;
}) {
  return (
    <li
      ref={rowRef}
      style={style}
      className={cx(
        'grid grid-cols-[auto_1.6rem_minmax(0,1fr)] items-start border-b border-line',
        dense ? 'gap-2.5 py-2.5' : 'gap-x-2.5 gap-y-2 py-3.5 pr-2',
        lifted && 'rounded-md bg-surface shadow-lift',
      )}
    >
      {move}
      <span aria-hidden className="type-display pt-2 text-xl leading-[1.2] text-accent-text">
        {numeral}
      </span>
      <div className="flex min-w-0 flex-col gap-2.5 pt-1">{children}</div>
    </li>
  );
}

/** A step's text at rest: tap it to edit. */
export function StepTextButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <AriaButton
      aria-label={label}
      onPress={onPress}
      className="cursor-text rounded-sm py-1 text-left [text-wrap:pretty] data-[hovered]:bg-sunk data-[pressed]:bg-sunk"
    >
      {children}
    </AriaButton>
  );
}

/** "Step photo added" with its thumbnail, and Remove. */
export function StepPhotoAdded({
  id,
  label,
  removeLabel,
  onRemove,
}: {
  id: string;
  label: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <span className="flex flex-wrap items-center gap-2.5">
      <Photo id={id} alt="" className="h-[54px] w-[72px] shrink-0 rounded-sm" />
      <span className="text-ink-muted">{label}</span>
      <Button variant="quiet" icon="close" onPress={onRemove} className="px-3">
        {removeLabel}
      </Button>
    </span>
  );
}

/** The phone editor's sticky Save recipe bar (UndoToasts sit above it). */
export function SaveBar({ children }: { children: ReactNode }) {
  return (
    <div
      data-save-bar
      className="sticky bottom-0 z-10 mt-auto border-t border-line bg-paper bg-(image:--grain) px-4 pt-3 pb-[max(1.125rem,env(safe-area-inset-bottom))]"
    >
      {children}
    </div>
  );
}

/** A desktop meta pill with the value typed straight into it: "Serves 6", "From Mom’s kitchen". */
export function MetaPill({
  before,
  after,
  value,
  onChange,
  label,
  placeholder,
  inputMode,
  isInvalid,
  onBlur,
  onFocus,
}: {
  before: string;
  after?: string;
  value: string;
  onChange: (v: string) => void;
  /** The accessible name when `before` doesn't say it all. */
  label?: string;
  placeholder?: string;
  inputMode?: 'numeric' | 'text';
  isInvalid?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
}) {
  return (
    <AriaTextField
      value={value}
      onChange={onChange}
      aria-label={label ?? before}
      isInvalid={isInvalid}
      onBlur={onBlur}
      onFocus={onFocus}
      inputMode={inputMode}
    >
      <Label
        className={cx(
          'flex min-h-[3.5rem] cursor-text items-center gap-1.5 bg-surface px-3.5 shadow-[inset_0_0_0_1.5px_var(--line-control)] focus-within:shadow-[inset_0_0_0_2px_var(--ink)]',
          'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-focus',
          isInvalid && 'shadow-[inset_0_0_0_2px_var(--danger)]!',
          fieldRadius,
        )}
      >
        <span className="text-ink-muted">{before}</span>
        <AutoSizeInput value={value} placeholder={placeholder} className="font-bold" />
        {after && <span className="text-ink-muted">{after}</span>}
      </Label>
    </AriaTextField>
  );
}

/** The desktop editor's foot: "Enter for next line · Ctrl+S to save · End a line with “:” for a section". */
export function KeyHints({ items }: { items: { keys?: string; text: string }[] }) {
  return (
    <p className="flex flex-wrap items-center gap-x-4.5 gap-y-1 text-[0.875rem] text-ink-muted">
      {items.flatMap((it, i) => [
        ...(i
          ? [
              <span key={`d${i}`} aria-hidden>
                ·
              </span>,
            ]
          : []),
        <span key={i}>
          {it.keys && <kbd className="font-[inherit] font-bold text-ink">{it.keys}</kbd>} {it.text}
        </span>,
      ])}
    </p>
  );
}

/** Record a voice note: the record dot, then "Stop · 0:12" while recording. */
export function RecordButton({ recording, children, onPress }: { recording: boolean; children: ReactNode; onPress: () => void }) {
  return (
    <AriaButton
      onPress={onPress}
      aria-pressed={recording}
      className={cx(
        'flex min-h-[4rem] w-full items-center justify-center gap-2 rounded-md bg-(--control-fill) font-bold text-ink tabular-nums',
        'shadow-[inset_0_0_0_var(--control-border)_var(--line-strong)] transition-[background-color,transform] duration-(--dur)',
        'data-[hovered]:bg-(--control-fill-hover) data-[pressed]:scale-[.97]',
      )}
    >
      <Icon
        name={recording ? 'stop' : 'record'}
        filled={!recording}
        className={cx('shrink-0 text-accent-text', recording && 'motion-safe:animate-breathe rounded-full')}
      />
      {children}
    </AriaButton>
  );
}
