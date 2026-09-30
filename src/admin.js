import './styles.css';
import { initializeApp } from 'firebase/app';
import {
    getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut,
} from 'firebase/auth';
import {
    getFirestore, doc, getDoc, collection, query, where, onSnapshot, writeBatch, setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { firebaseConfig, emailjs, ADMIN_EMAIL } from './config.js';
import { sendEmail, whatsappLink, mailtoLink, normalizePhone, isValidPhone } from './notify.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const focusId = new URLSearchParams(location.search).get('req');
let unsubs = [];

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function showToast(text) {
    $('toastText').innerText = text;
    $('toastNotification').classList.remove('hidden');
    setTimeout(() => $('toastNotification').classList.add('hidden'), 3500);
}

function show(view) {
    for (const id of ['loginView', 'notAdminView', 'adminView']) $(id).classList.toggle('hidden', id !== view);
}

// קוד בן 8 תווים ללא תווים מבלבלים (0/O, 1/I) – כ-10^12 אפשרויות
function generateCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

const CODE_SUBJECT = 'קוד הענן שלך לאפליקציית האימונים';
function codeMessage(name, code) {
    return `שלום ${name}! 🏋️\nהבקשה שלך לגיבוי בענן אושרה.\nקוד הענן שלך: ${code}\n\n` +
        'באפליקציה: לחץ על "סנכרון ענן" ← הזן את הקוד ← התחבר.';
}

function formatDate(ts) {
    return ts?.toDate ? ts.toDate().toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : '';
}

// כפתורי שליחת הקוד למשתמש (וואטסאפ + מייל)
function sendCodeButtons(r, code) {
    const msg = codeMessage(r.name, code);
    return `
        <div class="bg-emerald-50 border-2 border-dashed border-emerald-400 py-2 rounded-xl font-mono text-xl font-black text-emerald-700 tracking-widest text-center" dir="ltr">${esc(code)}</div>
        <div class="grid grid-cols-2 gap-2">
            <a href="${whatsappLink(r.phone, msg)}" target="_blank" rel="noopener" class="block text-center bg-[#25D366] hover:brightness-95 text-white font-bold py-3 rounded-xl text-sm">שלח בוואטסאפ</a>
            ${r.email ? `<a href="${mailtoLink(r.email, CODE_SUBJECT, msg)}" class="block text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm">שלח במייל</a>`
        : '<span class="block text-center bg-slate-100 text-slate-400 font-bold py-3 rounded-xl text-sm">אין מייל</span>'}
        </div>`;
}

function requestCard(id, r, highlighted) {
    const statusBadge = {
        pending: '<span class="bg-amber-100 text-amber-700 text-xs px-2.5 py-0.5 rounded-md font-semibold">ממתין</span>',
        approved: '<span class="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-0.5 rounded-md font-semibold">אושר</span>',
        rejected: '<span class="bg-rose-100 text-rose-700 text-xs px-2.5 py-0.5 rounded-md font-semibold">נדחה</span>',
    }[r.status] || '';
    const talk = `
        <div class="grid grid-cols-2 gap-2">
            <a href="tel:+${esc(r.phone)}" class="block text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm">📞 התקשר</a>
            <a href="${whatsappLink(r.phone, `היי ${r.name}, קיבלתי את הבקשה שלך לשמירה בענן באפליקציית Train&Fit 🙂\nהשירות בתשלום חד-פעמי של 50 ₪, והמידע שלך נשמר לתמיד. איך נוח לך לשלם?`)}" target="_blank" rel="noopener" class="block text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm">💬 צ'אט בוואטסאפ</a>
        </div>`;
    const actions = r.status === 'pending' ? `${talk}
        <div class="flex gap-2">
            <button onclick="approveRequest('${id}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-sm transition-all active:scale-95 text-sm">אשר והנפק קוד</button>
            <button onclick="rejectRequest('${id}')" class="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-4 rounded-xl transition-all text-sm">דחה</button>
        </div>` : r.status === 'approved' ? sendCodeButtons(r, r.code) : '';
    return `
        <div class="bg-white rounded-2xl shadow-sm border ${highlighted ? 'border-blue-400 ring-2 ring-blue-200' : 'border-slate-100'} p-5 space-y-3">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-bold text-lg text-slate-900">${esc(r.name)}</h3>
                    <div class="text-xs text-slate-500">${formatDate(r.createdAt)}</div>
                </div>
                ${statusBadge}
            </div>
            <div class="bg-slate-50 p-3 rounded-xl text-sm space-y-1 text-slate-700">
                <div>📱 <span class="font-mono" dir="ltr">+${esc(r.phone)}</span></div>
                <div>✉️ <span dir="ltr">${esc(r.email)}</span></div>
                <div class="pt-1 text-slate-600">${esc(r.message) || '<span class="text-slate-400">(ללא הודעה)</span>'}</div>
            </div>
            ${actions}
        </div>`;
}

async function autoEmailCode(r, code) {
    if (!r.email || !emailjs.userTemplateId) return false;
    try {
        return await sendEmail(emailjs.userTemplateId, { to_email: r.email, name: r.name, code });
    } catch (e) {
        console.error(e);
        return false;
    }
}

window.approveRequest = async function (id) {
    const snap = await getDoc(doc(db, 'access_requests', id));
    if (!snap.exists() || snap.data().status !== 'pending') return showToast('הבקשה כבר טופלה');
    const r = snap.data();
    if (!confirm(`לאשר ולהנפיק קוד ענן ל${r.name}?`)) return;
    const code = generateCode();

    const batch = writeBatch(db);
    batch.set(doc(db, 'sync_codes', code), {
        active: true, requestId: id, name: r.name, phone: r.phone, email: r.email, createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'access_requests', id), { status: 'approved', code, handledAt: serverTimestamp() });
    await batch.commit();

    showToast(await autoEmailCode(r, code)
        ? 'הקוד נשלח במייל ✅ שלח גם בוואטסאפ'
        : 'הקוד הונפק ✅ שלח אותו בוואטסאפ / במייל');
};

window.rejectRequest = async function (id) {
    if (!confirm('לדחות את הבקשה?')) return;
    await updateDoc(doc(db, 'access_requests', id), { status: 'rejected', handledAt: serverTimestamp() });
    showToast('הבקשה נדחתה');
};

window.issueManualCode = async function (e) {
    e.preventDefault();
    const r = {
        name: $('manName').value.trim(),
        phone: normalizePhone($('manPhone').value),
        email: $('manEmail').value.trim(),
    };
    if (!isValidPhone(r.phone)) return showToast('מספר הפלאפון אינו תקין');
    const code = generateCode();
    await setDoc(doc(db, 'sync_codes', code), { active: true, requestId: null, ...r, createdAt: serverTimestamp() });
    $('manualResult').innerHTML = `<div class="space-y-2 pt-2">${sendCodeButtons(r, code)}</div>`;
    e.target.reset();
    showToast(await autoEmailCode(r, code) ? 'הקוד הונפק ונשלח במייל ✅' : 'הקוד הונפק ✅');
};

window.toggleCode = async function (code, active) {
    if (!active && !confirm(`לבטל את הקוד ${code}? המשתמש לא יוכל לסנכרן יותר.`)) return;
    await updateDoc(doc(db, 'sync_codes', code), { active });
    showToast(active ? 'הקוד הופעל מחדש' : 'הקוד בוטל');
};

function startDashboard() {
    if (focusId) {
        unsubs.push(onSnapshot(doc(db, 'access_requests', focusId), (s) => {
            $('focusedRequest').innerHTML = s.exists()
                ? `<h2 class="text-lg font-bold text-slate-900 mb-3">הבקשה מהקישור</h2>${requestCard(s.id, s.data(), true)}`
                : '<div class="text-center text-slate-400 py-4">הבקשה מהקישור לא נמצאה</div>';
        }));
    }
    unsubs.push(onSnapshot(query(collection(db, 'access_requests'), where('status', '==', 'pending')), (qs) => {
        const docs = qs.docs.filter((d) => d.id !== focusId)
            .sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0));
        $('pendingList').innerHTML = docs.length
            ? docs.map((d) => requestCard(d.id, d.data(), false)).join('')
            : '<div class="text-center text-slate-400 py-6 font-medium">אין בקשות ממתינות</div>';
    }));
    unsubs.push(onSnapshot(collection(db, 'sync_codes'), (qs) => {
        const docs = qs.docs.sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0));
        $('codesList').innerHTML = docs.length ? docs.map((d) => {
            const c = d.data();
            return `
                <div class="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center justify-between gap-2">
                    <div class="min-w-0">
                        <div class="font-mono font-black tracking-widest ${c.active ? 'text-slate-900' : 'text-slate-300 line-through'}" dir="ltr">${esc(d.id)}</div>
                        <div class="text-xs text-slate-500 truncate">${esc(c.name)} · <span dir="ltr">+${esc(c.phone)}</span> · ${formatDate(c.createdAt)}</div>
                    </div>
                    <button onclick="toggleCode('${esc(d.id)}', ${!c.active})" class="shrink-0 text-xs font-bold px-3 py-2 rounded-lg ${c.active ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}">${c.active ? 'בטל' : 'הפעל'}</button>
                </div>`;
        }).join('') : '<div class="text-center text-slate-400 py-4 text-sm">עוד לא הונפקו קודים</div>';
    }));
}

window.adminGoogleLogin = async function () {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ login_hint: ADMIN_EMAIL, prompt: 'select_account' });
    try {
        await signInWithPopup(auth, provider);
    } catch (err) {
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') {
            await signInWithRedirect(auth, provider);
        } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
            console.error(err);
            showToast(err.code === 'auth/unauthorized-domain'
                ? 'הדומיין לא מאושר ב-Firebase (ראה SETUP.md)'
                : 'ההתחברות נכשלה');
        }
    }
};

window.adminLogout = () => signOut(auth);

async function isAdmin(user) {
    if (user.email === ADMIN_EMAIL && user.emailVerified) return true;
    try {
        return (await getDoc(doc(db, 'admins', user.uid))).exists();
    } catch {
        return false;
    }
}

onAuthStateChanged(auth, async (user) => {
    unsubs.forEach((u) => u());
    unsubs = [];
    if (!user || user.isAnonymous) return show('loginView');
    if (!(await isAdmin(user))) {
        $('notAdminEmail').innerText = user.email || user.uid;
        return show('notAdminView');
    }
    $('adminEmail').innerText = user.email || '';
    show('adminView');
    startDashboard();
});
