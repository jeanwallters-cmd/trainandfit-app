// מסך מלא + מניעת כיבוי מסך – עובד גם בדפדפן וגם באפליקציות Android / iOS.
// מצב המסך המלא נשמר, ומוחל מחדש אוטומטית אחרי כיבוי/הדלקת מסך או חזרה לאפליקציה.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { StatusBar } from '@capacitor/status-bar';

const FS_KEY = 'workout_fullscreen';
const platform = Capacitor.getPlatform(); // 'web' | 'android' | 'ios'
const isNative = platform !== 'web';

// תוסף נייטיבי מקומי (android/app/src/main/java/.../ImmersivePlugin.java)
const Immersive = registerPlugin('Immersive');

let fullscreenWanted = localStorage.getItem(FS_KEY) === '1';
let wakeLockWanted = false;
let webWakeLock = null;

function setFsButtonText() {
    const btnText = document.getElementById('fsBtnText');
    if (btnText) btnText.innerText = fullscreenWanted ? 'צא ממסך מלא' : 'מסך מלא';
}

async function applyFullscreen(enabled) {
    try {
        if (platform === 'android') {
            await Immersive.setImmersive({ enabled });
        } else if (platform === 'ios') {
            if (enabled) await StatusBar.hide(); else await StatusBar.show();
        } else if (enabled && !document.fullscreenElement && document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        } else if (!enabled && document.fullscreenElement && document.exitFullscreen) {
            await document.exitFullscreen();
        }
    } catch (err) {
        // בדפדפן כניסה למסך מלא מחייבת לחיצה – ננסה שוב בנגיעה הבאה
        console.log(`Fullscreen: ${err.message}`);
    }
}

export async function toggleFullscreen() {
    fullscreenWanted = !fullscreenWanted;
    localStorage.setItem(FS_KEY, fullscreenWanted ? '1' : '0');
    setFsButtonText();
    await applyFullscreen(fullscreenWanted);
}

// ---------- מניעת כיבוי המסך בזמן אימון ----------
async function acquireWebWakeLock() {
    try {
        if ('wakeLock' in navigator && !webWakeLock) {
            webWakeLock = await navigator.wakeLock.request('screen');
            webWakeLock.addEventListener('release', () => { webWakeLock = null; });
        }
    } catch (err) {
        console.log('Wake lock not active:', err);
    }
}

export async function requestWakeLock() {
    wakeLockWanted = true;
    if (isNative) {
        try { await KeepAwake.keepAwake(); } catch (e) { console.log('KeepAwake failed', e); }
    } else {
        await acquireWebWakeLock();
    }
}

export async function releaseWakeLock() {
    wakeLockWanted = false;
    if (isNative) {
        try { await KeepAwake.allowSleep(); } catch (e) { /* ignore */ }
    } else if (webWakeLock) {
        await webWakeLock.release().catch(() => {});
        webWakeLock = null;
    }
}

// ---------- החלה מחדש אחרי כיבוי מסך / מעבר אפליקציה ----------
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (fullscreenWanted) applyFullscreen(true);
    if (wakeLockWanted && !isNative) acquireWebWakeLock();
});

if (!isNative) {
    // הדפדפן יוצא ממסך מלא כשהמסך נכבה ולא מאפשר לחזור בלי מגע –
    // לכן בנגיעה הראשונה אחרי החזרה המסך המלא חוזר אוטומטית.
    const reenter = () => {
        if (fullscreenWanted && !document.fullscreenElement) applyFullscreen(true);
    };
    document.addEventListener('pointerdown', reenter, true);
    document.addEventListener('keydown', reenter, true);
    // יציאה ידנית (Esc / מחווה) מבטלת את הבקשה למסך מלא
    let leftByVisibility = false;
    document.addEventListener('visibilitychange', () => { if (document.hidden) leftByVisibility = true; });
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) { leftByVisibility = false; return; }
        // המתנה קצרה: בכיבוי מסך אירוע היציאה עלול להגיע לפני אירוע ההסתרה
        setTimeout(() => {
            if (!document.fullscreenElement && fullscreenWanted && !document.hidden && !leftByVisibility) {
                fullscreenWanted = false;
                localStorage.setItem(FS_KEY, '0');
                setFsButtonText();
            }
        }, 800);
    });
}

// מצב התחלתי
setFsButtonText();
if (fullscreenWanted && isNative) applyFullscreen(true);
