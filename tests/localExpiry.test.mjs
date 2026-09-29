// Runs src/localExpiry.js against the Firestore emulator (started by `npm test`).
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, getDocFromServer, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
let checks = 0;
globalThis.document = {
  hidden: false,
  getElementById: () => null,
  addEventListener: () => {},
  dispatchEvent: () => { checks++; },
};

const DAY = 864e5;
const L = await import('../src/localExpiry.js');
const app = initializeApp({ projectId: 'demo-test', apiKey: 'x' }, 'expiry-test');
const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080, { mockUserToken: { sub: 'DEV1' } });

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(cond ? '✓' : '✗', name, extra); };
const days = (ms) => (ms / DAY).toFixed(2);

// fresh install, online
L.ensureLocalPeriod();
L.attachServer(db, 'DEV1', { doc, getDoc: getDocFromServer, setDoc, updateDoc, serverTimestamp });
await L.syncServerTime();
let exp = Number(localStorage.getItem('workout_local_expires'));
ok('first sync: expiry = server start + 7 days', Math.abs(exp - Date.now() - 7 * DAY) < 60000, days(exp - Date.now()));

// tamper: extend local expiry by a month (e.g. editing storage)
localStorage.setItem('workout_local_expires', String(Date.now() + 37 * DAY));
await L.syncServerTime();
exp = Number(localStorage.getItem('workout_local_expires'));
ok('server restores the real expiry after local tampering', exp - Date.now() < 7 * DAY + 60000, days(exp - Date.now()));

// phone date moved 10 days forward: must NOT wipe the plans once the server answers
localStorage.setItem('workout_trusted_now', String(Date.now() + 10 * DAY));
ok('forward clock looks expired locally', L.isLocalExpired());
await L.syncServerTime();
ok('server corrects a forward clock: no reset', !L.shouldResetNow() && !L.isLocalExpired());

// tamper: phone clock / trusted time pushed back a month
localStorage.setItem('workout_trusted_now', String(Date.now() - 30 * DAY));
await L.syncServerTime();
ok('server time replaces a wrong trusted time', Math.abs(Number(localStorage.getItem('workout_trusted_now')) - Date.now()) < 60000);

// the week ends on the server (simulated by moving the server period 8 days back)
const devRef = doc(db, 'devices', 'DEV1');
const { withSecurityRulesDisabled } = await import('./emulatorAdmin.mjs');
await withSecurityRulesDisabled('devices/DEV1', { periodStart: Timestamp.fromMillis(Date.now() - 8 * DAY), lastSeen: Timestamp.fromMillis(Date.now() - DAY) });
localStorage.setItem('workout_last_reset', String(Date.now() - 9 * DAY)); // device was not reset since
checks = 0;
await L.syncServerTime();
ok('expired server week makes the app expire locally', L.isLocalExpired() && L.shouldResetNow() && checks > 0);

// a forged "already reset" marker from the future is ignored
await withSecurityRulesDisabled('devices/DEV1', { periodStart: Timestamp.fromMillis(Date.now() - 8 * DAY), lastSeen: Timestamp.fromMillis(Date.now() - DAY) });
localStorage.setItem('workout_last_reset', String(Date.now() + 365 * DAY));
await L.syncServerTime();
ok('forged future reset marker does not skip the reset', L.isLocalExpired());

// the app resets (as app.js does) -> a new server week starts
L.startLocalPeriod();
await new Promise((r) => setTimeout(r, 1500));
const snap = await getDoc(devRef);
ok('reset starts a new week on the server', Date.now() - snap.data().periodStart.toMillis() < 60000);
exp = Number(localStorage.getItem('workout_local_expires'));
ok('new local expiry is a fresh week', Math.abs(exp - Date.now() - 7 * DAY) < 60000, days(exp - Date.now()));
ok('not expired after the reset', !L.isLocalExpired());

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
