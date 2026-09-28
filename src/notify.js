// שליחת התראות ללא שרת: מייל דרך EmailJS, וואטסאפ דרך CallMeBot
import { emailjs, callmebot } from './config.js';

export function normalizePhone(phone) {
    let d = String(phone || '').replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    if (d.startsWith('0')) d = '972' + d.slice(1); // מספר ישראלי מקומי
    return d;
}

export function isValidPhone(phone) {
    return /^\d{10,15}$/.test(normalizePhone(phone));
}

export async function sendEmail(templateId, params) {
    if (!emailjs.publicKey || !emailjs.serviceId || !templateId) {
        console.warn('EmailJS is not configured (src/config.js)');
        return false;
    }
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            service_id: emailjs.serviceId,
            template_id: templateId,
            user_id: emailjs.publicKey,
            template_params: params,
        }),
    });
    if (!res.ok) throw new Error(`EmailJS ${res.status}: ${await res.text()}`);
    return true;
}

// הודעת וואטסאפ אוטומטית למספר של מנהל האפליקציה
export async function sendAdminWhatsApp(text) {
    if (!callmebot.phone || !callmebot.apiKey) {
        console.warn('CallMeBot is not configured (src/config.js)');
        return false;
    }
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(callmebot.phone)}` +
        `&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(callmebot.apiKey)}`;
    // CallMeBot לא מחזיר כותרות CORS – שולחים בלי לקרוא את התשובה
    await fetch(url, { mode: 'no-cors' });
    return true;
}

// קישור וואטסאפ עם הודעה מוכנה למספר מסוים (נפתח בוואטסאפ של המכשיר)
export function whatsappLink(phone, text) {
    return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text)}`;
}
