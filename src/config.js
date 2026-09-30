// ======================================================================
//  הגדרות האפליקציה – ראה SETUP.md להסבר מלא איך למלא כל שדה
// ======================================================================

// Firebase (תוכנית Spark החינמית). מפתחות Web של Firebase הם ציבוריים מטבעם –
// האבטחה נאכפת ע"י firestore.rules.
export const firebaseConfig = {
  apiKey: 'AIzaSyC9oG8mIsXL5NcvBT-yIQ7OPZhXpOc4DlQ',
  authDomain: 'trainandfit-2c18c.firebaseapp.com',
  projectId: 'trainandfit-2c18c',
  storageBucket: 'trainandfit-2c18c.firebasestorage.app',
  messagingSenderId: '120250908373',
  appId: '1:120250908373:web:cc3a7ad974e8286883ec5c',
};

// פרטי המנהל – לכאן נשלחות בקשות לקוד ענן (במייל ובוואטסאפ בו-זמנית)
export const ADMIN_EMAIL = 'tamirmaidani@gmail.com';
export const ADMIN_PHONE = '972528372666';

// כתובת דף האישור (admin.html) – הקישור שמגיע אליך במייל ובוואטסאפ.
export const ADMIN_URL = 'https://t-code-now.github.io/trainandfit-app/admin.html';

// מייל למנהל – FormSubmit (חינמי, בלי הרשמה). בבקשה הראשונה נשלח אליך מייל אימות חד-פעמי.
// אחרי האימות אפשר להחליף את הכתובת במחרוזת האקראית ש-FormSubmit שולח, כדי שהמייל לא יופיע בקוד.
export const FORMSUBMIT_TARGET = ADMIN_EMAIL;

// מייל למנהל – Web3Forms (חינם עד 250 בחודש, הכי אמין). המפתח מגיע מ-GitHub Secret
// בשם WEB3FORMS_ACCESS_KEY בזמן הבנייה. אם אין מפתח – נעשה שימוש ב-FormSubmit.
const buildEnv = import.meta.env || {};
export const WEB3FORMS_KEY = buildEnv.VITE_WEB3FORMS_KEY || '';

// אופציונלי: EmailJS (חינמי עד 200 מיילים בחודש) – לשליחת הקוד למשתמש במייל אוטומטית.
// אם לא מוגדר, בדף הניהול יש כפתור ששולח את הקוד מהמייל שלך בלחיצה.
export const emailjs = {
  publicKey: '',          // Account → General → Public Key
  serviceId: '',          // Email Services → Service ID
  userTemplateId: '',     // תבנית "הקוד שלך" שנשלחת למשתמש
};

// CallMeBot – שליחת וואטסאפ חינמית למספר שלך בלבד – https://www.callmebot.com/blog/free-api-whatsapp-messages/
export const callmebot = {
  phone: ADMIN_PHONE,
  apiKey: '',             // המפתח שהבוט שלח לך בוואטסאפ (ראה SETUP.md)
};

// בוט טלגרם – התראה מיידית ואמינה אליך (חינם, API רשמי של טלגרם). ראה SETUP.md
// הטוקן לא נשמר בריפו: הוא מגיע מ-GitHub Secret בשם TELEGRAM_BOT_TOKEN
// בזמן הבנייה, או מקובץ .env.local מקומי (לא נכנס לגיט).
const env = import.meta.env || {};
export const telegram = {
  botToken: env.VITE_TELEGRAM_BOT_TOKEN || '',
  chatId: env.VITE_TELEGRAM_CHAT_ID || '1633101453', // מזהה הטלגרם של המנהל (לא סודי)
};
