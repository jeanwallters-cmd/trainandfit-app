// שליחת התראות ללא שרת: מייל דרך FormSubmit / EmailJS, טלגרם דרך Bot API, וואטסאפ דרך CallMeBot
import { emailjs, callmebot, telegram, FORMSUBMIT_TARGET } from './config.js';

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

// מייל אוטומטי למנהל דרך FormSubmit
export async function sendAdminEmail(subject, fields) {
    if (!FORMSUBMIT_TARGET) return false;
    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(FORMSUBMIT_TARGET)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ _subject: subject, _template: 'table', _captcha: 'false', ...fields }),
    });
    const data = await res.json().catch(() => ({}));
    // FormSubmit מחזיר 200 גם כשהמייל לא נשלח (למשל כשהטופס צריך אישור מחדש) – בודקים את התשובה
    if (!res.ok || String(data.success) !== 'true') {
        throw new Error(`FormSubmit: ${data.message || res.status}`);
    }
    return true;
}

// קישור מייל עם הודעה מוכנה (נפתח באפליקציית המייל של המכשיר)
export function mailtoLink(to, subject, body) {
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// הודעת טלגרם מיידית למנהל, עם כפתור שפותח את פאנל הניהול
export async function sendAdminTelegram(text, buttonText, buttonUrl) {
    if (!telegram.botToken || !telegram.chatId) {
        console.warn('Telegram is not configured (src/config.js)');
        return false;
    }
    const params = {
        chat_id: telegram.chatId,
        text,
        disable_web_page_preview: true,
    };
    if (buttonText && buttonUrl) {
        params.reply_markup = JSON.stringify({ inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] });
    }
    const url = `https://api.telegram.org/bot${telegram.botToken}/sendMessage`;
    // בקשת טופס פשוטה – נשלחת גם אם הדפדפן לא מאפשר לקרוא את התשובה
    const res = await fetch(url, { method: 'POST', body: new URLSearchParams(params) });
    const data = await res.json().catch(() => ({ ok: true }));
    if (!data.ok) throw new Error(`Telegram: ${data.description}`);
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
