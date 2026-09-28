// שמירה מקומית זמנית: תוכניות האימון נשמרות במכשיר לשבוע אחד בלבד, ואז נמחקות.
// משתמש שמחובר לענן לא מושפע – הנתונים שלו שמורים בענן.
const EXPIRY_KEY = 'workout_local_expires';
const SYNC_KEY = 'workout_sync_id';
export const LOCAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const isCloudConnected = () => !!localStorage.getItem(SYNC_KEY);

function getExpiry() {
    const v = parseInt(localStorage.getItem(EXPIRY_KEY), 10);
    return Number.isFinite(v) ? v : null;
}

// מתחיל תקופה של שבוע מעכשיו
export function startLocalPeriod() {
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + LOCAL_TTL_MS));
    updateExpiryNote();
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
    return !isCloudConnected() && exp !== null && Date.now() >= exp;
}

export function updateExpiryNote() {
    const el = document.getElementById('localExpiryNote');
    if (!el) return;
    const exp = getExpiry();
    if (isCloudConnected() || exp === null) {
        el.classList.add('hidden');
        return;
    }
    const d = new Date(exp);
    el.innerText = `⏳ הזיכרון המקומי יתאפס ב-${d.toLocaleDateString('he-IL')} ${d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
    el.classList.remove('hidden');
}
