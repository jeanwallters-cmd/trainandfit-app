// מסך הפתיחה: מוצג 5 שניות מרגע פתיחת האפליקציה, ואז נעלם בהדרגה. נגיעה מדלגת.
const MIN_VISIBLE_MS = 5000;
const el = document.getElementById('introSplash');

if (el) {
    let hidden = false;
    const hide = () => {
        if (hidden) return;
        hidden = true;
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        setTimeout(() => el.remove(), 550);
    };
    setTimeout(hide, Math.max(0, MIN_VISIBLE_MS - performance.now()));
    el.addEventListener('click', hide);
}
