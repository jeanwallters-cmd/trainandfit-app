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

// כתובת דף האישור (admin.html) – הקישור שמגיע אליך במייל ובוואטסאפ.
export const ADMIN_URL = 'https://jeanwallters-cmd.github.io/trainandfit-app/admin.html';

// EmailJS (חינמי עד 200 מיילים בחודש) – https://www.emailjs.com
export const emailjs = {
  publicKey: '',          // Account → General → Public Key
  serviceId: '',          // Email Services → Service ID
  adminTemplateId: '',    // תבנית "בקשה חדשה" שנשלחת אליך
  userTemplateId: '',     // תבנית "הקוד שלך" שנשלחת למשתמש
};

// CallMeBot – שליחת וואטסאפ חינמית למספר שלך בלבד – https://www.callmebot.com/blog/free-api-whatsapp-messages/
export const callmebot = {
  phone: '',              // המספר שלך בפורמט בינלאומי, לדוג' 972501234567
  apiKey: '',             // המפתח שהבוט שלח לך בוואטסאפ
};
