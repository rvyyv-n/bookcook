import { useState, type ReactNode } from 'react';
import { FileTrigger } from 'react-aria-components';
import { applyBackup, BackupError, exportBackup, readBackup, type BackupFile, type RestoreMode } from '../../db/backup';
import { useSettings } from '../../db/hooks';
import { setSetting } from '../../db/settings';
import { useT } from '../../i18n';
import { formatDay, relativeTime } from '../../lib/format';
import { isNative } from '../../lib/platform/isNative';
import { saveFile } from '../../lib/platform/saveFile';
import { requestPersistentStorage } from '../../lib/platform/storagePersist';
import { Button, type ButtonVariant } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { Icon, type IconName } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';
import { useToast } from '../../ui/Toast';

/** A backup older than this (or none at all) gets the accent nudge. */
const OVERDUE_DAYS = 30;

/**
 * "Last backup: 34 days ago" with Back up now and Restore. On --accent-soft (and with the screen's
 * primary button) when a backup is overdue; a quiet card otherwise.
 */
export function BackupCard({ layout }: { layout: 'phone' | 'desk' }) {
  const t = useT();
  const ts = t.ui.settings;
  const toast = useToast();
  const { lastBackupAt } = useSettings();
  const [saving, setSaving] = useState(false);
  const restoring = useRestore();
  const busy = saving || restoring.busy;
  // Read once per visit; the page doesn't need to tick over while it's open.
  const [now] = useState(() => Date.now());
  const overdue = lastBackupAt === null || now - lastBackupAt > OVERDUE_DAYS * 86_400_000;
  const when = lastBackupAt === null ? ts.noBackup : ts.lastBackup(relativeTime(lastBackupAt));
  const body = overdue ? (layout === 'desk' ? ts.backupNudgeShort : ts.backupNudge) : ts.backupOk;

  async function backUp() {
    setSaving(true);
    try {
      const { blob, filename, counts } = await exportBackup();
      if (!(await saveFile(blob, filename))) {
        // Share sheet dismissed in the app: nothing was kept, so the last backup stands.
        await setSetting('lastBackupAt', lastBackupAt);
        return;
      }
      void requestPersistentStorage({ again: true });
      toast.show({ message: ts.backedUp(counts.recipes), tone: 'success' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      role="status"
      aria-label={ts.backup}
      className={cx(
        'flex rounded-lg px-4.5 py-4',
        overdue ? 'bg-accent-soft' : 'bg-sunk',
        layout === 'desk' ? 'flex-wrap items-center gap-x-3.5 gap-y-2.5' : 'flex-col gap-2.5',
      )}
    >
      <p className={cx('flex flex-col gap-0.5', layout === 'desk' && 'min-w-[12rem] flex-1')}>
        <b className="flex items-center gap-2">
          {layout === 'phone' && <Icon name="backup" className="shrink-0" />}
          {when}
        </b>
        <span>{body}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={overdue ? 'primary' : 'secondary'}
          icon={layout === 'desk' ? undefined : 'backup'}
          isDisabled={busy}
          onPress={backUp}
        >
          {ts.backUpNow}
        </Button>
        <RestoreButton restore={restoring} variant="quiet" icon="download">
          {ts.restore}
        </RestoreButton>
      </div>
      {restoring.sheet}
    </section>
  );
}

/**
 * Choosing a backup file and restoring it: the file picker, then the "Restore this backup?" sheet
 * (add to the cookbook, or replace it). Shared by Settings and the welcome screen.
 */
export function useRestore(onRestored?: () => void) {
  const t = useT();
  const ts = t.ui.settings;
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<BackupFile | null>(null);

  async function pick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      setPicked(await readBackup(file));
    } catch (e) {
      toast.show({ message: e instanceof BackupError && e.message === 'newer version' ? ts.newerBackup : ts.notABackup });
    } finally {
      setBusy(false);
    }
  }

  async function restore(mode: RestoreMode) {
    if (!picked) return;
    setBusy(true);
    try {
      const counts = await applyBackup(picked, mode);
      setPicked(null);
      toast.show({ message: (mode === 'replace' ? ts.replaced : ts.restored)(counts.recipes), tone: 'success' });
      onRestored?.();
    } catch {
      toast.show({ message: ts.restoreFailed });
    } finally {
      setBusy(false);
    }
  }

  const sheet = (
    <Sheet
      isOpen={picked !== null}
      onOpenChange={(open) => !open && !busy && setPicked(null)}
      title={ts.restoreTitle}
      description={picked && ts.restoreFrom(formatDay(picked.exportedAt), picked.counts.recipes)}
    >
      <div className="flex flex-col gap-4">
        <RestoreChoice hint={ts.restoreMergeHint}>
          <Button variant="primary" icon="download" isDisabled={busy} onPress={() => restore('merge')}>
            {ts.restoreMerge}
          </Button>
        </RestoreChoice>
        <RestoreChoice hint={ts.restoreReplaceHint}>
          <Button variant="destructive" isDisabled={busy} onPress={() => restore('replace')}>
            {ts.restoreReplace}
          </Button>
        </RestoreChoice>
      </div>
    </Sheet>
  );
  return { busy, pick, sheet };
}

/** The Restore button: it opens the file picker. Render `restore.sheet` once beside it. */
export function RestoreButton({
  restore,
  variant,
  icon,
  className,
  children,
}: {
  restore: ReturnType<typeof useRestore>;
  variant: ButtonVariant;
  icon?: IconName;
  className?: string;
  children: ReactNode;
}) {
  return (
    // Android has no type for .bookcook, so its picker would grey the file out: the app takes any file and checks it.
    <FileTrigger acceptedFileTypes={isNative() ? undefined : ['.bookcook', 'application/zip']} onSelect={restore.pick}>
      <Button variant={variant} icon={icon} isDisabled={restore.busy} className={className}>
        {children}
      </Button>
    </FileTrigger>
  );
}

function RestoreChoice({ hint, children }: { hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      {children}
      <p className="text-ink-muted">{hint}</p>
    </div>
  );
}
