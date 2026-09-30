# מדריך הגדרה

כל השירותים כאן **חינמיים**: Firebase (תוכנית Spark), Web3Forms / FormSubmit (מייל), בוט טלגרם, CallMeBot (וואטסאפ), GitHub Pages ו-GitHub Actions.

---

## איך זה עובד
1. משתמש לוחץ באפליקציה "צור גיבוי ענן חדש" וממלא שם, פלאפון, מייל ובקשה.
2. **בו-זמנית** נשלחים אליך מייל ל-tamirmaidani@gmail.com, הודעת טלגרם והודעת וואטסאפ ל-052-8372666, עם פרטי המשתמש וקישור לפאנל הניהול.
3. בפאנל הניהול (נפרד מהאפליקציה, רק אתה נכנס) יש כפתורי **📞 התקשר** ו-**💬 צ'אט בוואטסאפ** – מדברים עם האדם.
4. רק אחרי שאתה לוחץ **"אשר והנפק קוד"** נוצר קוד, ואתה שולח אותו בלחיצה **בוואטסאפ** ו/או **במייל**.
5. המשתמש מזין את הקוד ומקבל גישה קבועה. מהפאנל אפשר לבטל קוד בכל רגע, או להנפיק קוד ידנית בלי בקשה.

---

## 1. Firebase (פרויקט נפרד `trainandfit-2c18c` – לא משפיע על פרויקטים אחרים)

1. [Firebase Console](https://console.firebase.google.com/project/trainandfit-2c18c) → **Authentication → Sign-in method**:
   - הפעל **Anonymous** (האפליקציה)
   - הפעל **Google** (הכניסה שלך לפאנל)
2. **Authentication → Settings → Authorized domains → Add domain**: `t-code-now.github.io`
3. **Firestore Database → Rules** – הדבק את כל התוכן של `firestore.rules` ולחץ **Publish**.
   > רק חשבון Google ‏tamirmaidani@gmail.com מוגדר כמנהל. אף אחד אחר לא יכול לאשר או להנפיק קודים.

## 2. מייל אליך – Web3Forms (בלי הרשמה, דקה אחת)

1. היכנס ל-[web3forms.com](https://web3forms.com), הזן `tamirmaidani@gmail.com` ולחץ **Create Access Key**.
2. יגיע אליך מייל עם **Access Key** (מחרוזת ארוכה).
3. ב-GitHub → **Settings → Secrets and variables → Actions → New repository secret**:
   Name: `WEB3FORMS_ACCESS_KEY`, Secret: המפתח.
4. בנייה חדשה (push או Actions → Run workflow) – מאז כל בקשה מגיעה אליך למייל.

> גיבוי: אם Web3Forms לא זמין, האפליקציה מנסה לשלוח דרך FormSubmit. אם שניהם נכשלים – תקבל בטלגרם "⚠️ מייל הבקשה לא נשלח" עם הסיבה.

## 3. טלגרם אליך – בוט (מומלץ, הכי אמין)

1. בטלגרם פתח את **@BotFather** ← שלח `/newbot` ← תן שם (למשל `האימונים שלי – אישורים`) ושם משתמש שמסתיים ב-`bot`.
2. BotFather ישלח **טוקן** שנראה כך: `123456789:AAH...`
3. פתח את הבוט החדש שלך ולחץ **Start** (בלי זה הבוט לא יכול לשלוח לך הודעות).
4. פתח את **@userinfobot** ולחץ **Start** – הוא יחזיר את ה-**Id** שלך (מספר).
5. ב-GitHub: **Settings → Secrets and variables → Actions → New repository secret**, הוסף Secret:
   | Secret | ערך |
   |---|---|
   | `TELEGRAM_BOT_TOKEN` | הטוקן מ-BotFather |

   (ה-Id של המנהל, `1633101453`, כבר מוגדר בקוד. `TELEGRAM_CHAT_ID` נדרש רק כדי להחליף אותו.)

   הערכים לא נשמרים בקוד/בריפו – הם נכנסים לאפליקציה רק בזמן הבנייה. אחרי ההוספה הרץ שוב את הבנייה (Actions → Android APK → Run workflow) או עשה push.

מאז כל בקשה חדשה מגיעה אליך מיד בטלגרם עם כל הפרטים וכפתור **"✅ פתח לאישור"** שפותח את פאנל הניהול.
> הטוקן נכלל בקובץ האפליקציה שנבנה, לכן השתמש בבוט **ייעודי רק לזה**. הבוט שולח הודעות רק ל-Id שלך.

## 4. וואטסאפ אליך – בוט CallMeBot (הדרך החינמית היחידה בלי שרת)

זה הצעד היחיד שרק אתה יכול לעשות, כי הבוט נותן מפתח רק לבעל המספר:
1. פתח את [דף CallMeBot לוואטסאפ](https://www.callmebot.com/blog/free-api-whatsapp-messages/), שמור את מספר הבוט שמופיע שם באנשי הקשר בטלפון 052-8372666.
2. שלח לו בוואטסאפ: `I allow callmebot to send me messages`
3. תקבל תשובה עם **apikey** – שלח לי אותו (או הכנס אותו ב-`src/config.js` ← `callmebot.apiKey`).

> שליחת וואטסאפ **אוטומטית למשתמשים** דורשת WhatsApp Business API (בתשלום + שרת), ולכן את הקוד למשתמש אתה שולח בלחיצה אחת מהפאנל – מה שגם מתאים לזה שאתה מאשר רק אחרי שיחה.

## (אופציונלי) שליחת הקוד למשתמש במייל אוטומטית – EmailJS
בלי זה, כפתור "שלח במייל" בפאנל פותח מייל מוכן מהחשבון שלך. אם תרצה שליחה אוטומטית:
הירשם ב-[emailjs.com](https://www.emailjs.com), חבר את Gmail, צור תבנית עם To Email = `{{to_email}}` ותוכן שכולל `{{name}}` ו-`{{code}}`, ומלא ב-`src/config.js` את `publicKey`, `serviceId`, `userTemplateId`.

## 5. פאנל הניהול ואתר ה-Web – GitHub Pages

ב-GitHub: **Settings → Pages → Source: GitHub Actions**. מהריצה הבאה של `Web + Firestore rules` האתר עולה אוטומטית:
- אפליקציה: https://t-code-now.github.io/trainandfit-app/
- פאנל ניהול: https://t-code-now.github.io/trainandfit-app/admin.html

אחרי שינוי `src/config.js` – commit + push, וה-APK והאתר נבנים מחדש עם ההגדרות.

---

## 6. Android – חתימה

**דרך א' – מהטלפון, בלי מחשב (workflow חד-פעמי):**

1. צור טוקן: GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   Repository access: **Only select repositories** → `trainandfit-app`. Permissions → Repository → **Secrets: Read and write**. תוקף: 7 ימים.
2. במאגר → **Settings → Secrets and variables → Actions** הוסף:
   - `SECRETS_ADMIN_TOKEN` = הטוקן משלב 1
   - `KEYSTORE_BACKUP_PASSPHRASE` = סיסמה ארוכה שתבחר (לפחות 4 מילים). **שמור אותה** – בלעדיה אי אפשר לפתוח את הגיבוי.
3. Actions → **Android signing key (one-time)** → Run workflow. הוא יוצר את המפתח ושומר ישירות את 4 הסודות
   `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
   המפתח לא מודפס בלוג (המאגר ציבורי). אם כבר קיים מפתח – הריצה נעצרת ולא דורסת אותו.
4. **גיבוי:** בעמוד הריצה הורד את `trainandfit-signing-backup-ENCRYPTED` ושמור אותו (למשל ב-Google Drive) – הוא נמחק מ-GitHub אחרי 90 יום.
   פתיחה (במחשב): `openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in trainandfit-signing-backup.tar.gz.enc | tar -xzf -`
5. מחק את הטוקן (Developer settings) ואת הסוד `SECRETS_ADMIN_TOKEN` – הם לא נחוצים יותר.

**דרך ב' – במחשב:** הרץ `./scripts/generate-android-keystore.sh` (דורש Java), **גבה את `signing/` ואת הסיסמה**, והוסף את 4 הערכים שהוא מדפיס כ-Secrets.

בשתי הדרכים: מעכשיו כל בנייה יוצרת APK + AAB חתומים, והקישור הקבוע מתעדכן:
https://github.com/t-code-now/trainandfit-app/releases/tag/latest-apk

**המפתח הוא לתמיד:** אם הוא אובד, אי אפשר לעדכן את האפליקציה אצל מי שכבר התקין. מעבר ממפתח debug למפתח קבוע דורש הסרה והתקנה מחדש (פעם אחת).

**התקנה בלי שום אזהרה:** חתימה לבדה לא מבטלת את אזהרת "מקורות לא ידועים" בהתקנת APK מהאינטרנט – זה מנגנון של Android. בלי אזהרות מתקינים רק דרך **Google Play** (חשבון מפתח: 25$ חד-פעמי). מעלים את קובץ ה-AAB למסלול **Internal testing**, והבודקים מתקינים מקישור של החנות.

## 7. iOS – חתימה ו-TestFlight

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
