import type { ReactNode, Ref } from 'react';
import {
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
import { cx } from './cx';
import { Icon } from './Icon';

export const inputClass =
  'w-full min-h-14 rounded-md border-2 border-line bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-muted/80 ' +
  'transition-colors outline-none data-[hovered]:border-line-strong data-[focused]:border-ink ' +
  'data-[focus-visible]:outline-3 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-(--focus) data-[invalid]:border-danger';

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
  /** Extra control shown next to the input (e.g. the dictate button). */
  accessory?: ReactNode;
  inputRef?: Ref<HTMLInputElement & HTMLTextAreaElement>;
}

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
  accessory,
  inputRef,
  ...rest
}: TextFieldProps) {
  return (
    <AriaTextField {...rest} className={cx('flex flex-col gap-1.5', className)}>
      <Label className={cx('font-bold text-ink', labelHidden && 'sr-only')}>{label}</Label>
      <div className="flex items-start gap-2">
        {multiline ? (
          <TextArea
            ref={inputRef}
            rows={rows}
            placeholder={placeholder}
            className={cx(inputClass, 'resize-y leading-relaxed', inputClassName)}
          />
        ) : (
          <Input ref={inputRef} placeholder={placeholder} className={cx(inputClass, inputClassName)} />
        )}
        {accessory}
      </div>
      {description && (
        <Text slot="description" className="text-sm text-ink-muted">
          {description}
        </Text>
      )}
      <FieldError className="text-sm font-bold text-danger">{errorMessage}</FieldError>
    </AriaTextField>
  );
}

export function SearchField({
  label,
  placeholder,
  className,
  ...rest
}: { label: string; placeholder?: string; className?: string } & Omit<SearchFieldProps, 'className'>) {
  return (
    <AriaSearchField {...rest} className={cx('group relative', className)}>
      <Label className="sr-only">{label}</Label>
      <Icon name="search" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-muted" />
      <Input
        placeholder={placeholder}
        className={cx(inputClass, 'rounded-full bg-sunk pr-12 pl-12 [&::-webkit-search-cancel-button]:hidden')}
      />
    </AriaSearchField>
  );
}
