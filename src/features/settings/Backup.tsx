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
import { RowButton } from '../../ui/Rows';
import { cx } from '../../ui/cx';
import { type IconName } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';
import { useToast } from '../../ui/Toast';

/** A backup older than this (or none at all) is overdue: the date shows in the accent colour. */
const OVERDUE_DAYS = 30;

/** Android has no type for .bookcook, so its picker would grey the file out: the app takes any file and checks it. */
const RESTORE_TYPES = () => (isNative() ? undefined : ['.bookcook', 'application/zip']);

/** Back up now: saves the .bookcook file, and says how many recipes it holds. Resolves true once saved. */
export function useBackUp() {
  const ts = useT().ui.settings;
  const toast = useToast();
  const { lastBackupAt } = useSettings();
  const [saving, setSaving] = useState(false);

  async function backUp(): Promise<boolean> {
    setSaving(true);
    try {
      const { blob, filename, counts } = await exportBackup();
      if (!(await saveFile(blob, filename))) {
        // Share sheet dismissed in the app: nothing was kept, so the last backup stands.
        await setSetting('lastBackupAt', lastBackupAt);
        return false;
      }
      void requestPersistentStorage({ again: true });
      toast.show({ message: ts.backedUp(counts.recipes), tone: 'success' });
      return true;
    } finally {
      setSaving(false);
    }
  }
  return { saving, backUp };
}

/** When the last backup was, and whether it's overdue. Read once per visit; the page doesn't tick over. */
export function useBackupStatus() {
  const ts = useT().ui.settings;
  const { lastBackupAt } = useSettings();
  const [now] = useState(() => Date.now());
  const overdue = lastBackupAt === null || now - lastBackupAt > OVERDUE_DAYS * 86_400_000;
  const when = lastBackupAt === null ? ts.noBackup : ts.lastBackup(relativeTime(lastBackupAt));
  return { overdue, when, hint: overdue ? ts.backupNudge : ts.backupOk };
}

/**
 * Back up now (with when the last one was, in the accent colour once it's overdue) and Restore, as
 * two rows of a settings card. Render them inside the card; the restore sheet comes with them.
 */
export function BackupRows() {
  const ts = useT().ui.settings;
  const { saving, backUp } = useBackUp();
  const restoring = useRestore();
  const { overdue, when } = useBackupStatus();
  const busy = saving || restoring.busy;
  return (
    <>
      <RowButton
        icon="backup"
        label={ts.backUpNow}
        value={<span className={cx(overdue && 'font-bold text-accent-text')}>{when}</span>}
        isDisabled={busy}
        onPress={() => void backUp()}
      />
      <FileTrigger acceptedFileTypes={RESTORE_TYPES()} onSelect={restoring.pick}>
        <RowButton icon="download" label={ts.restore} isDisabled={restoring.busy} />
      </FileTrigger>
      {restoring.sheet}
    </>
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
    <FileTrigger acceptedFileTypes={RESTORE_TYPES()} onSelect={restore.pick}>
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
