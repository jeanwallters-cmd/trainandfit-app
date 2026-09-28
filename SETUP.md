# מדריך הגדרה

כל השירותים כאן **חינמיים**: Firebase (תוכנית Spark), EmailJS (עד 200 מיילים בחודש), CallMeBot (וואטסאפ אליך), GitHub Pages ו-GitHub Actions.

---

## 1. Firebase (פרויקט `pe-app-db`)

1. [Firebase Console](https://console.firebase.google.com/project/pe-app-db) → **Authentication → Sign-in method**
   - הפעל **Anonymous** (משמש את האפליקציה)
   - הפעל **Email/Password** (משמש אותך בדף האישור)
2. **Authentication → Users → Add user** – צור לעצמך משתמש (אימייל + סיסמה).
3. **Firestore Database → Rules** – הדבק את כל התוכן של הקובץ `firestore.rules` ולחץ **Publish**.
   > ⚠️ הכללים החדשים סוגרים את הנתיב הישן והפתוח (`artifacts/...`) שבו השתמשה גרסת ה-Web הקודמת. קודים ישנים לא יעבדו יותר – כל משתמש צריך לבקש קוד חדש.
4. פתח את דף האישור (סעיף 4), התחבר עם המשתמש שיצרת. יופיע לך **המזהה (UID)** שלך.
   ב-**Firestore → Start collection** צור אוסף בשם `admins`, ובתוכו מסמך שה-Document ID שלו הוא ה-UID הזה (אפשר להוסיף שדה כלשהו, למשל `name`). רענן את הדף – אתה מנהל.

## 2. מייל – EmailJS

1. הירשם ב-[emailjs.com](https://www.emailjs.com) → **Email Services → Add service** (למשל Gmail) → העתק את ה-**Service ID**.
2. **Email Templates → Create** – תבנית **"בקשה חדשה"** (נשלחת אליך):
   - To Email: **המייל שלך**
   - Subject: `בקשה חדשה לקוד ענן – {{name}}`
   - Content:
     ```
     שם: {{name}}
     טלפון: {{phone}}
     מייל: {{email}}
     בקשה: {{message}}

     לאישור: {{approve_url}}
     ```
3. תבנית נוספת **"הקוד שלך"** (נשלחת למשתמש):
   - To Email: `{{to_email}}`
   - Subject: `קוד הענן שלך לאפליקציית האימונים`
   - Content:
     ```
     שלום {{name}},
     הבקשה שלך אושרה! קוד הענן שלך: {{code}}
     באפליקציה: סנכרון ענן ← הזן את הקוד ← התחבר.
     ```
4. **Account → General** → העתק את ה-**Public Key**.
5. מלא ב-`src/config.js` את `emailjs.publicKey`, `serviceId`, `adminTemplateId`, `userTemplateId`.

## 3. וואטסאפ – CallMeBot

1. היכנס ל-[CallMeBot WhatsApp](https://www.callmebot.com/blog/free-api-whatsapp-messages/), שמור את המספר של הבוט שמופיע שם באנשי הקשר, ושלח לו בוואטסאפ: `I allow callmebot to send me messages`
2. הבוט יחזיר לך **apikey**.
3. מלא ב-`src/config.js`: `callmebot.phone` (המספר שלך, למשל `972501234567`) ו-`callmebot.apiKey`.

**איך זה עובד:** כל בקשה חדשה שולחת אליך הודעת וואטסאפ אוטומטית עם פרטי המשתמש וקישור לאישור. אחרי שאתה מאשר, הקוד נשלח למשתמש **במייל אוטומטית**, ובוואטסאפ בלחיצה על "שלח את הקוד בוואטסאפ" (נפתחת הודעה מוכנה אליו בוואטסאפ שלך).
> שליחת וואטסאפ אוטומטית ישירות למשתמש דורשת את WhatsApp Business API, שהוא בתשלום ודורש שרת. לכן שליחת הקוד למשתמש בוואטסאפ היא לחיצה אחת שלך.

## 4. דף האישור ואתר ה-Web – GitHub Pages

ב-GitHub: **Settings → Pages → Source: GitHub Actions**. מהריצה הבאה של `Web + Firestore rules` האתר עולה אוטומטית:
- אפליקציה: https://jeanwallters-cmd.github.io/trainandfit-app/
- דף אישור: https://jeanwallters-cmd.github.io/trainandfit-app/admin.html

אחרי שינוי `src/config.js` – commit + push, וה-APK והאתר נבנים מחדש עם ההגדרות.

---

## 5. Android – חתימה

1. הרץ פעם אחת: `./scripts/generate-android-keystore.sh` (דורש Java). **גבה את `signing/` ואת הסיסמה.**
2. הוסף ב-GitHub → **Settings → Secrets and variables → Actions** את 4 הערכים שהסקריפט מדפיס:
   `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
3. מעכשיו כל push בונה APK + AAB חתומים, והקישור הקבוע מתעדכן:
   https://github.com/jeanwallters-cmd/trainandfit-app/releases/tag/latest-apk

**התקנה בלי שום אזהרה:** חתימה לבדה לא מבטלת את אזהרת "מקורות לא ידועים" בהתקנת APK מהאינטרנט – זה מנגנון של Android. בלי אזהרות מתקינים רק דרך **Google Play** (חשבון מפתח: 25$ חד-פעמי). מעלים את קובץ ה-AAB למסלול **Internal testing**, והבודקים מתקינים מקישור של החנות.

## 6. iOS – חתימה ו-TestFlight

ב-iOS אין התקנה של קובץ חופשי – רק דרך **TestFlight** או **App Store** (Apple Developer Program: 99$ לשנה). בשתי הדרכים ההתקנה ללא אזהרות.

1. ב-[App Store Connect](https://appstoreconnect.apple.com) צור אפליקציה עם Bundle ID `com.trainandfit.app`.
2. **Users and Access → Integrations → App Store Connect API** → צור מפתח עם תפקיד **Admin**, הורד את קובץ ה-`.p8`.
3. הוסף Secrets:
   | Secret | ערך |
   |---|---|
   | `ASC_KEY_ID` | Key ID |
   | `ASC_ISSUER_ID` | Issuer ID |
   | `ASC_KEY_P8_BASE64` | `base64 -i AuthKey_XXXX.p8` |
   | `APPLE_TEAM_ID` | Team ID (developer.apple.com → Membership) |
4. כל push בונה, חותם ומעלה ל-TestFlight. מוסיפים בודקים ב-App Store Connect → TestFlight.

---

## בדיקת כללי האבטחה
```bash
cd tests && npm install && npm test   # דורש Java
```
