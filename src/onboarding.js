// מדריך פתיחה: מוצג פעם אחת בלבד, בפתיחה הראשונה אחרי ההתקנה (מתחת למסך הפתיח, כך שהוא מופיע מיד כשהפתיח נעלם).
const DONE_KEY = 'onboarding_done_v1';

const STEPS = [
    { img: 'step1', title: 'ברוכים הבאים ל-Train&Fit', text: 'כל תוכניות האימון שלכם במקום אחד. בוחרים תוכנית ולוחצים על <b>"התחל אימון"</b>.' },
    { img: 'step2', title: 'בונים אימון משלכם', text: 'לוחצים על <b>"צור תוכנית אימון חדשה"</b>, קובעים סטים ומנוחה, ולכל תרגיל בוחרים – <b>לפי זמן</b> או <b>לפי חזרות</b>.' },
    { img: 'step3', title: 'מתאמנים עם טיימר', text: '<b class="text-green-600">מסך ירוק</b> = זמן עבודה. צפצוף ב-3 השניות האחרונות, ותמיד רואים מה הבא בתור.' },
    { img: 'step4', title: 'סיימתם את החזרות?', text: 'בתרגיל לפי חזרות הטיימר מחכה לכם. לוחצים <b>"בוצע!"</b> כדי לעבור הלאה.' },
    { img: 'step5', title: 'מסך אדום = מנוחה', text: 'נושמים ומתכוננים לתרגיל הבא. אפשר <b>להשהות</b> או <b>לסיים</b> את האימון בכל רגע.' },
    { img: 'step6', title: 'מסך מלא ושמירה מקומית', text: '<b>"מסך מלא"</b> נשאר גם אחרי כיבוי המסך. התוכניות נשמרות במכשיר <b>לשבוע בלבד</b> – מועד האיפוס מופיע למעלה.' },
    { img: 'step7', title: 'שומרים בענן – לתמיד ☁️', text: 'לוחצים <b>"סנכרון ענן"</b> ← <b>"צור גיבוי ענן חדש"</b> ושולחים בקשה. מקבלים קוד אישי, והאימונים נשמרים לתמיד ומסתנכרנים בין מכשירים.' },
];

const root = document.getElementById('onboarding');
let index = 0;

function isDone() {
    try { return localStorage.getItem(DONE_KEY) === '1'; } catch { return true; }
}

function render() {
    const s = STEPS[index];
    const last = index === STEPS.length - 1;
    root.querySelector('[data-ob="badge"]').innerText = `שלב ${index + 1} מתוך ${STEPS.length}`;
    root.querySelector('[data-ob="skip"]').classList.toggle('invisible', last);
    root.querySelector('[data-ob="title"]').innerText = s.title;
    root.querySelector('[data-ob="text"]').innerHTML = s.text;
    const img = root.querySelector('[data-ob="img"]');
    img.src = `./guide/${s.img}.webp`;
    img.alt = s.title;
    root.querySelector('[data-ob="next"]').innerText = last ? 'בואו נתחיל! 💪' : 'הבא';
    root.querySelector('[data-ob="dots"]').innerHTML = STEPS.map((_, n) =>
        `<span class="h-2 rounded-full transition-all duration-300 ${n === index ? 'w-6 bg-blue-600' : 'w-2 bg-slate-300'}"></span>`).join('');
    const body = root.querySelector('[data-ob="body"]');
    body.classList.remove('ob-enter');
    void body.offsetWidth; // restart the fade-in animation
    body.classList.add('ob-enter');
}

function go(n) {
    if (n < 0 || n >= STEPS.length) return;
    index = n;
    render();
}

function finish() {
    try { localStorage.setItem(DONE_KEY, '1'); } catch { /* ignore */ }
    root.style.opacity = '0';
    root.style.pointerEvents = 'none';
    setTimeout(() => root.remove(), 400);
}

export function isOnboardingOpen() {
    return !!root && root.isConnected && !root.classList.contains('hidden') && root.style.opacity !== '0';
}

// כפתור/מחוות "חזרה" בזמן המדריך: שקופית קודמת (בראשונה – לא עושה כלום)
export function onboardingBack() {
    if (index > 0) go(index - 1);
}

if (root) {
    if (isDone()) {
        root.remove();
    } else {
        // preload the images so moving between steps is instant
        STEPS.forEach((s) => { const i = new Image(); i.src = `./guide/${s.img}.webp`; });
        root.querySelector('[data-ob="next"]').addEventListener('click', () => (index === STEPS.length - 1 ? finish() : go(index + 1)));
        root.querySelector('[data-ob="skip"]').addEventListener('click', finish);
        // swipe: in RTL the next step comes from the left, so a finger moving right goes forward
        let startX = null;
        root.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
        root.addEventListener('touchend', (e) => {
            if (startX === null) return;
            const dx = e.changedTouches[0].clientX - startX;
            startX = null;
            if (Math.abs(dx) < 50) return;
            if (dx > 0) go(index + 1); else go(index - 1);
        });
        render();
        root.classList.remove('hidden');
    }
}
