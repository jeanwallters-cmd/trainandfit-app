import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
    getFirestore, doc, getDoc, setDoc, addDoc, collection, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { firebaseConfig, ADMIN_URL, emailjs } from './config.js';
import { sendEmail, sendAdminWhatsApp, isValidPhone, normalizePhone } from './notify.js';

const LOCAL_KEY = 'workout_app_workouts';
const SYNC_KEY = 'workout_sync_id';
const REQUEST_KEY = 'workout_access_request';

let db = null, auth = null;
let syncTimeout = null;
let isCloudReady = false;
let currentSyncId = localStorage.getItem(SYNC_KEY) || null;
let currentRequestId = localStorage.getItem(REQUEST_KEY) || null;
let requestUnsub = null;

const syncDoc = (code) => doc(db, 'workout_syncs', code);
const codeDoc = (code) => doc(db, 'sync_codes', code);

function updateCloudStatusUI(status) {
    const topIndicator = document.getElementById('topCloudIndicator');
    const topText = document.getElementById('topCloudText');

    if (status === 'online') {
        if (topIndicator) topIndicator.className = currentSyncId ? 'cloud-indicator online' : 'cloud-indicator';
        if (topText) topText.innerText = currentSyncId ? `ענן (${currentSyncId})` : 'מקומי בלבד';
    } else if (status === 'syncing') {
        if (topIndicator) topIndicator.className = 'cloud-indicator syncing';
        if (topText) topText.innerText = 'מסנכרן...';
    } else if (status === 'error') {
        if (topIndicator) topIndicator.className = 'cloud-indicator error';
        if (topText) topText.innerText = 'שגיאת סנכרון';
    }
}

async function initFirebase() {
    updateCloudStatusUI('online');
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        await signInAnonymously(auth);
        isCloudReady = true;
        updateCloudStatusUI('online');

        // אם קיים קוד סנכרון, מושכים נתונים ראשוניים
        if (currentSyncId) await fetchCloudWorkouts(currentSyncId, false);
        if (currentRequestId && !currentSyncId) watchRequest(currentRequestId);
        return true;
    } catch (e) {
        console.error('Firebase init failed', e);
        if (currentSyncId) updateCloudStatusUI('error');
        return false;
    }
}

window.scheduleCloudSync = function () {
    // שמירה מקומית תמיד
    localStorage.setItem(LOCAL_KEY, JSON.stringify(window.workouts));

    if (!isCloudReady || !currentSyncId) return;

    updateCloudStatusUI('syncing');
    if (syncTimeout) clearTimeout(syncTimeout);

    syncTimeout = setTimeout(async () => {
        try {
            await setDoc(syncDoc(currentSyncId), { workouts: window.workouts, updatedAt: new Date().toISOString() });
            updateCloudStatusUI('online');
        } catch (e) {
            console.error('Cloud sync failed', e);
            updateCloudStatusUI('error');
        }
    }, 1200);
};

async function fetchCloudWorkouts(code, notify = true) {
    if (!isCloudReady) return false;
    try {
        updateCloudStatusUI('syncing');
        const docSnap = await getDoc(syncDoc(code));

        if (docSnap.exists()) {
            const data = docSnap.data();
            if (Array.isArray(data.workouts)) {
                window.workouts = data.workouts;
                localStorage.setItem(LOCAL_KEY, JSON.stringify(window.workouts));
                window.renderList();
                if (notify) window.showToast('הנתונים סונכרנו בהצלחה מהענן! 🎉');
            }
        } else {
            // קוד חדש שאושר – מעלים את האימונים המקומיים לענן
            await setDoc(syncDoc(code), { workouts: window.workouts, updatedAt: new Date().toISOString() });
            if (notify) window.showToast('הגיבוי בענן נוצר והאימונים שלך נשמרו בו! ☁️');
        }
        updateCloudStatusUI('online');
        return true;
    } catch (e) {
        console.error(e);
        updateCloudStatusUI('error');
        if (notify) window.showToast(e.code === 'permission-denied' ? 'הקוד אינו פעיל' : 'שגיאה בתקשורת עם הענן');
        return false;
    }
}

function showCloudView(view) {
    for (const id of ['cloudUnconnectedView', 'cloudRequestView', 'cloudPendingView', 'cloudConnectedView']) {
        document.getElementById(id).classList.toggle('hidden', id !== view);
    }
}

window.openCloudModal = function () {
    const existingInput = document.getElementById('existingSyncId');
    if (existingInput) existingInput.value = '';

    if (currentSyncId) {
        document.getElementById('displaySyncId').innerText = currentSyncId;
        showCloudView('cloudConnectedView');
    } else if (currentRequestId) {
        showCloudView('cloudPendingView');
    } else {
        showCloudView('cloudUnconnectedView');
    }
    document.getElementById('cloudModal').classList.remove('hidden');
};

window.closeCloudModal = function () {
    document.getElementById('cloudModal').classList.add('hidden');
};

// ---------- בקשת גישה ליצירת קוד ענן ----------
window.showRequestForm = function () {
    showCloudView('cloudRequestView');
};

window.submitAccessRequest = async function (e) {
    e.preventDefault();
    const name = document.getElementById('reqName').value.trim();
    const phone = document.getElementById('reqPhone').value.trim();
    const email = document.getElementById('reqEmail').value.trim();
    const message = document.getElementById('reqMessage').value.trim();

    if (!isValidPhone(phone)) {
        window.showToast('מספר הפלאפון אינו תקין');
        return;
    }
    if (!isCloudReady) {
        window.showToast('טוען חיבור לענן... נסה שוב בעוד כמה שניות');
        return;
    }

    const btn = document.getElementById('reqSubmitBtn');
    btn.disabled = true;
    btn.innerText = 'שולח...';
    try {
        const ref = await addDoc(collection(db, 'access_requests'), {
            uid: auth.currentUser.uid,
            name, phone: normalizePhone(phone), email, message,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
        currentRequestId = ref.id;
        localStorage.setItem(REQUEST_KEY, ref.id);

        const approveUrl = `${ADMIN_URL}?req=${ref.id}`;
        const results = await Promise.allSettled([
            sendEmail(emailjs.adminTemplateId, {
                request_id: ref.id, name, phone: normalizePhone(phone), email,
                message: message || '-', approve_url: approveUrl,
            }),
            sendAdminWhatsApp(
                `🏋️ בקשה חדשה לקוד ענן\nשם: ${name}\nטלפון: ${normalizePhone(phone)}\nמייל: ${email}\n` +
                `בקשה: ${message || '-'}\n\nלאישור: ${approveUrl}`,
            ),
        ]);
        results.filter((r) => r.status === 'rejected').forEach((r) => console.error('notify failed', r.reason));

        watchRequest(ref.id);
        showCloudView('cloudPendingView');
        window.showToast('הבקשה נשלחה לאישור ✅');
    } catch (err) {
        console.error(err);
        window.showToast('שליחת הבקשה נכשלה, נסה שוב');
    } finally {
        btn.disabled = false;
        btn.innerText = 'שלח בקשה לאישור';
    }
};

function watchRequest(id) {
    if (requestUnsub) requestUnsub();
    requestUnsub = onSnapshot(doc(db, 'access_requests', id), (snap) => {
        const title = document.getElementById('pendingTitle');
        const text = document.getElementById('pendingText');
        if (!snap.exists()) return;
        const { status } = snap.data();
        if (status === 'approved') {
            title.innerText = 'הבקשה אושרה! ✅';
            text.innerText = 'קוד הענן נשלח אליך במייל ובוואטסאפ. הזן אותו כאן כדי להתחבר.';
        } else if (status === 'rejected') {
            title.innerText = 'הבקשה לא אושרה';
            text.innerText = 'אפשר לשלוח בקשה חדשה.';
        }
    }, (err) => console.warn('request watch', err));
}

window.cancelAccessRequest = function () {
    if (requestUnsub) requestUnsub();
    requestUnsub = null;
    currentRequestId = null;
    localStorage.removeItem(REQUEST_KEY);
    showCloudView('cloudRequestView');
};

// ---------- התחברות עם קוד מאושר ----------
window.connectExistingSync = async function (inputId = 'existingSyncId') {
    const codeInput = document.getElementById(inputId);
    const code = codeInput ? codeInput.value.replace(/[\s-]/g, '').toUpperCase() : '';
    if (!code) {
        window.showToast('נא להזין קוד סנכרון');
        return;
    }
    if (!/^[A-Z0-9]{4,20}$/.test(code)) {
        window.showToast('קוד הסנכרון לא נמצא בענן');
        return;
    }
    if (!isCloudReady) {
        window.showToast('טוען חיבור לענן... נסה שוב בעוד כמה שניות');
        return;
    }

    try {
        const codeSnap = await getDoc(codeDoc(code));
        if (!codeSnap.exists() || codeSnap.data().active !== true) {
            window.showToast('קוד הסנכרון לא נמצא בענן');
            return;
        }
    } catch (e) {
        console.error(e);
        window.showToast('שגיאה בתקשורת עם הענן');
        return;
    }

    const success = await fetchCloudWorkouts(code, true);
    if (success) {
        currentSyncId = code;
        localStorage.setItem(SYNC_KEY, code);
        if (requestUnsub) requestUnsub();
        currentRequestId = null;
        localStorage.removeItem(REQUEST_KEY);
        updateCloudStatusUI('online');
        window.closeCloudModal();
    }
};

window.disconnectSync = function () {
    currentSyncId = null;
    localStorage.removeItem(SYNC_KEY);
    updateCloudStatusUI('online');
    window.closeCloudModal();
    window.showToast('התנתקת מהענן. המידע יישמר מקומית בדפדפן.');
};

window.copySyncId = async function () {
    if (!currentSyncId) return;
    try {
        await navigator.clipboard.writeText(currentSyncId);
    } catch {
        const el = document.createElement('textarea');
        el.value = currentSyncId;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    }
    window.showToast('הקוד הועתק: ' + currentSyncId);
};

// אתחול מערכת הענן
initFirebase();
