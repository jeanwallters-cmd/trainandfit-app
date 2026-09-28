// הגנה מסגירה בטעות: החלקת "חזרה" / כפתור חזרה לא סוגרים את האפליקציה,
// ובאמצע אימון הם לא עושים כלום.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

const isHidden = (id) => document.getElementById(id).classList.contains('hidden');
const workoutActive = () => window.isWorkoutActive && window.isWorkoutActive();
const WORKOUT_HINT = 'האימון פעיל – לסיום לחץ "סיים אימון עכשיו"';

if (Capacitor.isNativePlatform()) {
    // רישום מאזין מבטל את ברירת המחדל (סגירת האפליקציה)
    App.addListener('backButton', () => {
        if (workoutActive()) {
            window.showToast(WORKOUT_HINT);
        } else if (!isHidden('cloudModal')) {
            window.closeCloudModal();
        } else if (!isHidden('formView')) {
            window.showList();
        } else {
            // במקום לסגור – ממזער. האפליקציה חוזרת בדיוק למקום שבו הייתה
            App.minimizeApp();
        }
    });
} else {
    // בדפדפן: מחוות/כפתור "חזרה" באמצע אימון לא יוצאים מהדף
    const view = document.getElementById('activeWorkoutView');
    let wasActive = false;
    new MutationObserver(() => {
        const active = workoutActive();
        if (active && !wasActive) history.pushState({ guard: true }, '');
        wasActive = active;
    }).observe(view, { attributes: true, attributeFilter: ['class'] });
    if (workoutActive()) { history.pushState({ guard: true }, ''); wasActive = true; }
    window.addEventListener('popstate', () => {
        if (workoutActive()) {
            history.pushState({ guard: true }, '');
            window.showToast(WORKOUT_HINT);
        }
    });
    window.addEventListener('beforeunload', (e) => {
        if (workoutActive()) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}
