// Makes the key that signs Bookcook's Android releases, and gives it to GitHub for the release workflow.
//   node scripts/make-signing-key.mjs            make the key (once, ever) and upload it
//   node scripts/make-signing-key.mjs --upload   upload the existing key again (e.g. to a new repo)
//
// Every release must be signed with the same key, or Android won't install it over the previous
// version. The key and its password are kept in ~/.bookcook/: back that folder up somewhere safe.
// Nothing secret is printed. Needs Java's keytool and the GitHub CLI (gh), signed in.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const REPO = 'rvyyv-n/bookcook';
const dir = join(homedir(), '.bookcook');
const keystore = join(dir, 'bookcook-release.p12');
const passwordFile = join(dir, 'bookcook-release-password.txt');
const uploadOnly = process.argv.includes('--upload');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function findKeytool() {
  const exe = process.platform === 'win32' ? 'keytool.exe' : 'keytool';
  const candidates = [process.env.KEYTOOL, process.env.JAVA_HOME && join(process.env.JAVA_HOME, 'bin', exe)];
  for (const root of [
    'C:/Program Files/Java',
    'C:/Program Files (x86)/Java',
    'C:/Program Files/Eclipse Adoptium',
    'C:/Program Files/Microsoft',
  ]) {
    if (existsSync(root)) for (const d of readdirSync(root)) candidates.push(join(root, d, 'bin', exe));
  }
  candidates.push('C:/Program Files/Android/Android Studio/jbr/bin/keytool.exe');
  const found = candidates.find((c) => c && existsSync(c));
  if (found) return found;
  // Last, whatever is on the PATH.
  return spawnSync('keytool', ['-help'], { stdio: 'ignore' }).error ? null : 'keytool';
}

function setSecret(name, value) {
  const r = spawnSync('gh', ['secret', 'set', name, '--repo', REPO], { input: value, stdio: ['pipe', 'ignore', 'inherit'] });
  if (r.status !== 0) fail(`Couldn't set the ${name} secret. Is gh installed and signed in (gh auth login)?`);
  console.log(`Set the ${name} secret on ${REPO}.`);
}

if (!uploadOnly) {
  if (existsSync(keystore)) fail(`A key already exists at ${keystore}. Keep using it; to upload it again, add --upload.`);
  const keytool = findKeytool();
  if (!keytool) fail("Java's keytool was not found. Install a JDK (for example Temurin) or set KEYTOOL to its path.");
  mkdirSync(dir, { recursive: true });
  const password = randomBytes(24).toString('base64url');
  const r = spawnSync(
    keytool,
    [
      '-genkeypair',
      '-storetype',
      'PKCS12',
      '-keystore',
      keystore,
      '-alias',
      'bookcook',
      '-keyalg',
      'RSA',
      '-keysize',
      '4096',
      '-validity',
      '36500',
      '-storepass',
      password,
      '-keypass',
      password,
      '-dname',
      'CN=Bookcook',
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  if (r.status !== 0 || !existsSync(keystore)) fail('keytool could not make the key.');
  writeFileSync(passwordFile, password + '\n', { mode: 0o600 });
  console.log(`Made the key: ${keystore}`);
}

if (!existsSync(keystore) || !existsSync(passwordFile)) fail(`No key in ${dir}. Run this without --upload first.`);
setSecret('BOOKCOOK_KEYSTORE_BASE64', readFileSync(keystore).toString('base64'));
setSecret('BOOKCOOK_KEYSTORE_PASSWORD', readFileSync(passwordFile, 'utf8').trim());
console.log(`\nDone. Back up ${dir} somewhere safe: without it, future releases can't update the app.`);
