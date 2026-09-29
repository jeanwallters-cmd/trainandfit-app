// שמירה מקומית זמנית: תוכניות האימון נשמרות במכשיר לשבוע אחד בלבד, ואז נמחקות.
// משתמש שמחובר לענן לא מושפע – הנתונים שלו שמורים בענן.
//
// הגנה משינוי שעון הטלפון – שתי שכבות:
// 1. "זמן אמין" מקומי: סופרים רק זמן שעבר קדימה. החזרת השעון אחורה לא מחזירה את הספירה.
// 2. זמן שרת (Firebase): כשיש אינטרנט, תחילת השבוע והשעה הנוכחית נלקחים מהשרת,
//    וכללי האבטחה לא מאפשרים להתחיל שבוע חדש לפני שהקודם נגמר.

const EXPIRY_KEY = 'workout_local_expires';   // מועד האיפוס, ב"זמן אמין"
const TRUSTED_KEY = 'workout_trusted_now';    // הזמן האמין האחרון שנמדד
const WALL_KEY = 'workout_wall_last';         // שעון המכשיר במדידה האחרונה
const RESET_KEY = 'workout_last_reset';       // מתי (בזמן אמין) היה האיפוס האחרון
const SYNC_KEY = 'workout_sync_id';
export const LOCAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let server = null; // { db, uid, fs } אחרי התחברות לענן (fs = פונקציות Firestore)
// מצב אימות הזמן מול השרת: 'pending' עד שהענן עולה, 'ok' אחרי סנכרון, 'failed' אם אין שרת
let serverState = 'pending';
let lastServerSync = 0;
const SERVER_FRESH_MS = 2 * 60 * 1000;
const SERVER_WAIT_MS = 10 * 1000;
setTimeout(() => {
    if (serverState === 'pending') {
        serverState = 'failed';
        document.dispatchEvent(new Event('local-expiry-check'));
    }
}, SERVER_WAIT_MS);

export function markServerUnavailable() {
    serverState = 'failed';
    document.dispatchEvent(new Event('local-expiry-check'));
}

const num = (key) => {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) && v > 0 ? v : null;
};

export const isCloudConnected = () => !!localStorage.getItem(SYNC_KEY);

// שכבה 1: זמן שמתקדם רק קדימה, גם אם שעון הטלפון מוחזר אחורה
export function trustedNow() {
    const wall = Date.now();
    const last = num(WALL_KEY);
    let t = num(TRUSTED_KEY);
    if (t === null) t = wall;
    else if (last !== null && wall > last) t += wall - last;
    localStorage.setItem(TRUSTED_KEY, String(t));
    localStorage.setItem(WALL_KEY, String(wall));
    return t;
}

function setTrustedNow(t) {
    localStorage.setItem(TRUSTED_KEY, String(t));
    localStorage.setItem(WALL_KEY, String(Date.now()));
}

const getExpiry = () => num(EXPIRY_KEY);

// מתחיל תקופה של שבוע מעכשיו (אחרי איפוס / התקנה / ניתוק מהענן)
export function startLocalPeriod() {
    const t = trustedNow();
    localStorage.setItem(EXPIRY_KEY, String(t + LOCAL_TTL_MS));
    localStorage.setItem(RESET_KEY, String(t));
    updateExpiryNote();
    restartServerPeriod();
}

// בחיבור לענן אין תפוגה
export function clearLocalPeriod() {
    localStorage.removeItem(EXPIRY_KEY);
    updateExpiryNote();
}

export function ensureLocalPeriod() {
    if (!isCloudConnected() && getExpiry() === null) startLocalPeriod();
}

export function isLocalExpired() {
    const exp = getExpiry();
    return !isCloudConnected() && exp !== null && trustedNow() >= exp;
}

// האם למחוק עכשיו? כשיש אינטרנט – רק אחרי שהשרת אישר שהשבוע באמת נגמר,
// כדי ששעון שגוי בטלפון (למשל תאריך שהוזז קדימה) לא ימחק תוכניות.
export function shouldResetNow() {
    if (!isLocalExpired()) return false;
    const online = typeof navigator === 'undefined' || navigator.onLine !== false;
    if (!online || serverState === 'failed') return true;
    if (serverState === 'pending') return false; // מחכים לשרת (עד 10 שניות)
    if (Date.now() - lastServerSync < SERVER_FRESH_MS && lastServerSync > 0) return true;
    syncServerTime(); // הזמן מהשרת ישן – מאמתים קודם; הסנכרון יפעיל בדיקה חוזרת
    return false;
}

export function updateExpiryNote() {
    const el = document.getElementById('localExpiryNote');
    if (!el) return;
    const exp = getExpiry();
    if (isCloudConnected() || exp === null) {
        el.classList.add('hidden');
        return;
    }
    // מציגים לפי השעון של המכשיר את הזמן שנותר בפועל
    const d = new Date(Date.now() + Math.max(0, exp - trustedNow()));
    el.innerText = `⏳ הזיכרון המקומי יתאפס ב-${d.toLocaleDateString('he-IL')} ${d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
    el.classList.remove('hidden');
}

// ---------- שכבה 2: זמן ותקופה מהשרת ----------
const deviceDoc = () => server.fs.doc(server.db, 'devices', server.uid);

async function restartServerPeriod() {
    if (!server) return;
    const { updateDoc, serverTimestamp } = server.fs;
    try {
        // כללי האבטחה מאפשרים זאת רק אם השבוע הקודם בשרת כבר נגמר
        await updateDoc(deviceDoc(), { periodStart: serverTimestamp(), lastSeen: serverTimestamp() });
        await syncServerTime();
    } catch (e) {
        // השבוע בשרת עוד לא נגמר – נשארים עם המועד של השרת
        await syncServerTime();
    }
}

// מסנכרן את הזמן האמין ואת מועד האיפוס מול השרת. מחזיר true אם הצליח.
export async function syncServerTime() {
    if (!server) return false;
    const { getDoc, setDoc, updateDoc, serverTimestamp } = server.fs;
    try {
        const ref = deviceDoc();
        const existing = await getDoc(ref);
        if (existing.exists()) {
            await updateDoc(ref, { lastSeen: serverTimestamp() });
        } else {
            await setDoc(ref, { periodStart: serverTimestamp(), lastSeen: serverTimestamp() });
        }
        const snap = await getDoc(ref);
        const { periodStart, lastSeen } = snap.data();
        const serverNow = lastSeen.toMillis();
        const serverEnd = periodStart.toMillis() + LOCAL_TTL_MS;
        setTrustedNow(serverNow);
        serverState = 'ok';
        lastServerSync = Date.now();

        if (!isCloudConnected()) {
            const lastReset = num(RESET_KEY);
            if (serverNow >= serverEnd && lastReset !== null && lastReset >= serverEnd && lastReset <= serverNow) {
                // המכשיר כבר אופס בלי אינטרנט אחרי שהשבוע בשרת נגמר – רק מתחילים שבוע חדש בשרת
                await updateDoc(ref, { periodStart: serverTimestamp(), lastSeen: serverTimestamp() });
                return syncServerTime();
            }
            // השרת קובע את מועד האיפוס (אי אפשר להאריך אותו מקומית)
            localStorage.setItem(EXPIRY_KEY, String(serverEnd));
            updateExpiryNote();
        }
        document.dispatchEvent(new Event('local-expiry-check'));
        return true;
    } catch (e) {
        console.warn('server time sync failed', e?.message || e);
        if (serverState !== 'ok') serverState = 'failed';
        document.dispatchEvent(new Event('local-expiry-check'));
        return false;
    }
}

export function attachServer(db, uid, fs) {
    server = { db, uid, fs };
    syncServerTime();
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) syncServerTime();
    });
}
