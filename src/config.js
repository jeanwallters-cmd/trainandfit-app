// ======================================================================
//  הגדרות האפליקציה – ראה SETUP.md להסבר מלא איך למלא כל שדה
// ======================================================================

// Firebase (תוכנית Spark החינמית). מפתחות Web של Firebase הם ציבוריים מטבעם –
// האבטחה נאכפת ע"י firestore.rules.
export const firebaseConfig = {
  apiKey: 'AIzaSyD0PtDlw-A547sGs6LdgcV7-bCxsVQaEXk',
  authDomain: 'pe-app-db.firebaseapp.com',
  projectId: 'pe-app-db',
  storageBucket: 'pe-app-db.firebasestorage.app',
  messagingSenderId: '722767574124',
  appId: '1:722767574124:web:5ff0bcc30310d6dd1e9449',
};

// פרטי המנהל – לכאן נשלחות בקשות לקוד ענן (במייל ובוואטסאפ בו-זמנית)
export const ADMIN_EMAIL = 'tamirmaidani@gmail.com';
export const ADMIN_PHONE = '972528372666';

// כתובת דף האישור (admin.html) – הקישור שמגיע אליך במייל ובוואטסאפ.
export const ADMIN_URL = 'https://jeanwallters-cmd.github.io/trainandfit-app/admin.html';

// מייל למנהל – FormSubmit (חינמי, בלי הרשמה). בבקשה הראשונה נשלח אליך מייל אימות חד-פעמי.
// אחרי האימות אפשר להחליף את הכתובת במחרוזת האקראית ש-FormSubmit שולח, כדי שהמייל לא יופיע בקוד.
export const FORMSUBMIT_TARGET = ADMIN_EMAIL;

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
