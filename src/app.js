import { requestWakeLock, releaseWakeLock, toggleFullscreen } from './native.js';
import { ensureLocalPeriod, isLocalExpired, startLocalPeriod, updateExpiryNote } from './localExpiry.js';

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// תוכניות ברירת מחדל מוכנות עם תרגילים אמיתיים
let defaultWorkouts = [
    {
        id: 'w_gift',
        name: 'אימון מתנה',
        goal: 'אימון כללי - לגוף כולו!',
        sets: 3,
        setRest: 60,
        exercises: [
            { name: "ריצה במקום", type: "time", workTime: 40, restTime: 20, repsCount: 0 },
            { name: "סקוואט", type: "reps", workTime: 0, restTime: 20, repsCount: 10 },
            { name: "שכיבות סמיכה", type: "time", workTime: 40, restTime: 20, repsCount: 0 },
            { name: "קפיצה בפתיחה וסגירה רגליים", type: "time", workTime: 40, restTime: 20, repsCount: 0 }
        ]
    }
];

// טעינה מ-localStorage אם קיימת
// שמירה מקומית לשבוע בלבד – אחרי שבוע התוכניות נמחקות מהמכשיר
if (isLocalExpired()) {
    localStorage.removeItem('workout_app_workouts');
    startLocalPeriod();
}
ensureLocalPeriod();

let storedWorkouts = null;
try { storedWorkouts = JSON.parse(localStorage.getItem('workout_app_workouts')); } catch (e) { /* נתונים פגומים – חוזרים לברירת מחדל */ }
window.workouts = Array.isArray(storedWorkouts) ? storedWorkouts : JSON.parse(JSON.stringify(defaultWorkouts));

// משתני מערכת לאימון פעיל
let activeWorkout = null;
let currentSet = 1;
let currentExIndex = 0;
let currentPhase = 'prep'; // 'work', 'repRest', 'setRest', 'prep'
let timeLeft = 0;
let isPaused = false;
let timerInterval = null;

function showToast(text) {
    const toast = document.getElementById('toastNotification');
    const toastText = document.getElementById('toastText');
    if (toast && toastText) {
        toastText.innerText = text;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}
window.showToast = showToast;

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// מחולל צלילים ייחודיים לזיהוי שמיעתי מלא
function playSound(soundType) {
    try {
        if (!audioCtx) initAudio();
        const now = audioCtx.currentTime;

        if (soundType === 'countdown') {
            // צליל תקתוק קצר (3, 2, 1)
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.1);
        } 
        else if (soundType === 'startWork') {
            // צליל תחילת עבודה חזק, יציב וגבוה
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc1.type = 'triangle';
            osc2.type = 'square';

            osc1.frequency.setValueAtTime(523.25, now); // C5
            osc1.frequency.setValueAtTime(659.25, now + 0.15); // E5

            osc2.frequency.setValueAtTime(1046.50, now); // C6
            osc2.frequency.setValueAtTime(1318.51, now + 0.15); // E6

            gain.gain.setValueAtTime(0.6, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(audioCtx.destination);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.45);
            osc2.stop(now + 0.45);
        } 
        else if (soundType === 'startRest') {
            // צליל תחילת מנוחה נמוך ויורד
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.35);

            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start(now);
            osc.stop(now + 0.4);
        }
        else if (soundType === 'finish') {
            // צליל סיום אימון ניצחון
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                gain.gain.setValueAtTime(0.4, now + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now + idx * 0.1);
                osc.stop(now + idx * 0.1 + 0.4);
            });
        }
    } catch (e) {
        console.log("Audio not supported or blocked");
    }
}

function showList() {
    document.getElementById('formView').classList.add('hidden');
    document.getElementById('activeWorkoutView').classList.add('hidden');
    document.getElementById('listView').classList.remove('hidden');
    document.body.className = "min-h-screen text-slate-800 bg-slate-50 transition-colors duration-500 pb-20";
    renderList();
}

function renderList() {
    const listEl = document.getElementById('workoutList');
    listEl.innerHTML = '';

    if (window.workouts.length === 0) {
        listEl.innerHTML = `<div class="text-center text-slate-400 py-10 font-medium">אין תוכניות אימון. לחץ על "צור תוכנית אימון חדשה"!</div>`;
        return;
    }

    window.workouts.forEach(w => {
        // חישוב זמן כולל משוער
        let singleSetTime = w.exercises.reduce((sum, ex) => sum + (ex.type === 'time' ? ex.workTime : 30) + ex.restTime, 0);
        let totalSec = (singleSetTime * w.sets) + ((w.sets - 1) * w.setRest);
        let totalMin = Math.ceil(totalSec / 60);

        const card = document.createElement('div');
        card.className = "bg-white rounded-2xl shadow-sm border border-slate-100 p-5 transition-all hover:shadow-md";
        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h3 class="font-bold text-lg text-slate-900">${esc(w.name)}</h3>
                    <span class="inline-block bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-md font-semibold mt-1">${esc(w.goal)}</span>
                </div>
                <div class="text-xs text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">~${totalMin} דק'</div>
            </div>

            <div class="text-xs text-slate-500 font-medium mb-3">
                <span class="font-bold text-slate-700">${w.sets} סטים</span> • 
                <span class="font-bold text-slate-700">${w.exercises.length} תרגילים</span> בכל סט
            </div>

            <div class="bg-slate-50 p-2.5 rounded-xl mb-4 text-xs space-y-1 text-slate-600">
                ${w.exercises.map((ex, i) => `
                    <div class="flex justify-between items-center">
                        <span class="font-semibold text-slate-800">${i + 1}. ${esc(ex.name)}</span>
                        <span class="text-slate-500">${ex.type === 'reps' ? `<span class="font-bold text-indigo-600">${ex.repsCount} חזרות</span> | ${ex.restTime} ש' מנוחה` : `${ex.workTime} ש' עבודה | ${ex.restTime} ש' מנוחה`}</span>
                    </div>
                `).join('')}
            </div>

            <div class="flex gap-2">
                <button onclick="startWorkoutInit('${w.id}')" class="flex-1 bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl shadow-sm transition-all active:scale-95 text-sm">
                    התחל אימון
                </button>
                <button onclick="openForm('${w.id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold p-3 rounded-xl transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                </button>
                <button onclick="deleteWorkout('${w.id}')" class="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold p-3 rounded-xl transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                </button>
            </div>
        `;
        listEl.appendChild(card);
    });
}
window.renderList = renderList;

function openForm(id = null) {
    document.getElementById('listView').classList.add('hidden');
    document.getElementById('formView').classList.remove('hidden');

    const title = document.getElementById('formTitle');
    const container = document.getElementById('exerciseInputsContainer');
    container.innerHTML = '';

    if (id) {
        const w = window.workouts.find(x => x.id === id);
        title.innerText = "עריכת אימון";
        document.getElementById('editId').value = w.id;
        document.getElementById('wName').value = w.name;
        document.getElementById('wGoal').value = w.goal;
        document.getElementById('wSets').value = w.sets;
        document.getElementById('wSetRest').value = w.setRest;

        w.exercises.forEach(ex => addExerciseInput(ex.name, ex.type || 'time', ex.workTime, ex.restTime, ex.repsCount || 10));
    } else {
        title.innerText = "יצירת אימון חדש";
        document.getElementById('workoutForm').reset();
        document.getElementById('editId').value = "";
        // הוספת 3 שדות ברירת מחדל לטופס חדש
        addExerciseInput("תרגיל 1", 'time', 40, 20, 10);
        addExerciseInput("תרגיל 2", 'time', 40, 20, 10);
        addExerciseInput("תרגיל 3", 'time', 40, 20, 10);
    }
}

function addExerciseInput(name = '', type = 'time', workTime = 40, restTime = 20, repsCount = 10) {
    const container = document.getElementById('exerciseInputsContainer');
    const div = document.createElement('div');
    div.className = "exercise-item bg-slate-50 border border-slate-200 p-2.5 sm:p-3 rounded-2xl space-y-2 relative w-full overflow-hidden";
    div.innerHTML = `
        <div class="flex gap-1.5 sm:gap-2 items-center w-full">
            <input type="text" value="${esc(name)}" placeholder="שם התרגיל (לדוג': שכיבות סמיכה)" required class="ex-name flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <select class="ex-type shrink-0 bg-white border border-slate-200 rounded-xl px-1.5 sm:px-2 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold" onchange="toggleExType(this)">
                <option value="time" ${type === 'time' ? 'selected' : ''}>לפי זמן</option>
                <option value="reps" ${type === 'reps' ? 'selected' : ''}>לפי חזרות</option>
            </select>
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="shrink-0 text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors" title="מחק תרגיל">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs ex-time-inputs ${type === 'reps' ? 'hidden' : ''}">
            <div class="flex items-center bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg justify-between gap-1">
                <span class="text-emerald-800 font-medium shrink-0">עבודה (ש')</span>
                <input type="number" min="0" value="${workTime}" required class="ex-work w-14 sm:w-16 bg-white border border-emerald-200 text-center font-bold text-emerald-700 py-1 rounded text-xs sm:text-sm">
            </div>
            <div class="flex items-center bg-rose-50 border border-rose-100 px-2 py-1 rounded-lg justify-between gap-1">
                <span class="text-rose-800 font-medium shrink-0">מנוחה (ש')</span>
                <input type="number" min="0" value="${restTime}" required class="ex-rest w-14 sm:w-16 bg-white border border-rose-200 text-center font-bold text-rose-700 py-1 rounded text-xs sm:text-sm">
            </div>
        </div>
        <div class="ex-reps-inputs ${type === 'time' ? 'hidden' : ''} grid grid-cols-2 gap-2 text-xs">
            <div class="flex items-center bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg justify-between gap-1">
                <span class="text-indigo-800 font-bold shrink-0">חזרות</span>
                <input type="number" min="1" value="${repsCount}" required class="ex-reps w-14 sm:w-16 bg-white border border-indigo-200 text-center font-black text-indigo-700 py-1 rounded text-xs sm:text-sm">
            </div>
            <div class="flex items-center bg-rose-50 border border-rose-100 px-2 py-1 rounded-lg justify-between gap-1">
                <span class="text-rose-800 font-bold shrink-0">מנוחה (ש')</span>
                <input type="number" min="0" value="${restTime}" required class="ex-reps-rest w-14 sm:w-16 bg-white border border-rose-200 text-center font-bold text-rose-700 py-1 rounded text-xs sm:text-sm">
            </div>
        </div>
    `;
    container.appendChild(div);
}

function toggleExType(selectEl) {
    const container = selectEl.closest('.exercise-item');
    const timeInputs = container.querySelector('.ex-time-inputs');
    const repsInputs = container.querySelector('.ex-reps-inputs');
    if (selectEl.value === 'reps') {
        timeInputs.classList.add('hidden');
        repsInputs.classList.remove('hidden');
    } else {
        timeInputs.classList.remove('hidden');
        repsInputs.classList.add('hidden');
    }
}

function saveWorkout(e) {
    e.preventDefault();

    const id = document.getElementById('editId').value || 'w_' + Date.now();
    const wName = document.getElementById('wName').value;
    const wGoal = document.getElementById('wGoal').value;
    const wSets = parseInt(document.getElementById('wSets').value);
    const wSetRest = parseInt(document.getElementById('wSetRest').value);

    const exItems = document.querySelectorAll('.exercise-item');
    const exercises = Array.from(exItems).map(item => {
        const type = item.querySelector('.ex-type').value;
        return {
            name: item.querySelector('.ex-name').value,
            type: type,
            workTime: type === 'time' ? (parseInt(item.querySelector('.ex-work').value) || 0) : 0,
            restTime: type === 'time' ? (parseInt(item.querySelector('.ex-rest').value) || 0) : (parseInt(item.querySelector('.ex-reps-rest').value) || 0),
            repsCount: type === 'reps' ? (parseInt(item.querySelector('.ex-reps').value) || 0) : 0
        };
    });

    if (exercises.length === 0) {
        showToast('אנא הוסף לפחות תרגיל אחד לאימון');
        return;
    }

    const newWorkout = { id, name: wName, goal: wGoal, sets: wSets, setRest: wSetRest, exercises };

    const existingIndex = window.workouts.findIndex(x => x.id === id);
    if (existingIndex > -1) {
        window.workouts[existingIndex] = newWorkout;
    } else {
        window.workouts.push(newWorkout);
    }

    if (window.scheduleCloudSync) window.scheduleCloudSync();
    showList();
    showToast('האימון נשמר בהצלחה');
}

function deleteWorkout(id) {
    window.workouts = window.workouts.filter(x => x.id !== id);
    if (window.scheduleCloudSync) window.scheduleCloudSync();
    renderList();
    showToast('האימון נמחק');
}

// שמירת מצב האימון הפעיל – אם האפליקציה נסגרת (החלקה בטעות, כיבוי ע"י המערכת) האימון משוחזר
const ACTIVE_KEY = 'workout_active_session';
const RESUME_MAX_AGE_MS = 3 * 60 * 60 * 1000;

function saveSession() {
    if (!activeWorkout) return;
    try {
        localStorage.setItem(ACTIVE_KEY, JSON.stringify({
            workout: activeWorkout, currentSet, currentExIndex, currentPhase, timeLeft, savedAt: Date.now(),
        }));
    } catch (e) { /* storage full – ignore */ }
}

function clearSession() {
    localStorage.removeItem(ACTIVE_KEY);
}

function isWorkoutActive() {
    return !document.getElementById('activeWorkoutView').classList.contains('hidden');
}

function setPausedUI(paused) {
    isPaused = paused;
    const btn = document.getElementById('btnPause');
    if (isPaused) {
        btn.innerText = "המשך אימון";
        btn.classList.remove('bg-white/20');
        btn.classList.add('bg-amber-500', 'text-amber-950');
    } else {
        btn.innerText = "השהה";
        btn.classList.remove('bg-amber-500', 'text-amber-950');
        btn.classList.add('bg-white/20');
    }
}

function showActiveView() {
    document.getElementById('listView').classList.add('hidden');
    document.getElementById('formView').classList.add('hidden');
    document.getElementById('activeWorkoutView').classList.remove('hidden');
    document.getElementById('activeName').innerText = activeWorkout.name;
}

function resumeSession() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(ACTIVE_KEY)); } catch (e) { /* ignore */ }
    if (!s || !s.workout || !Array.isArray(s.workout.exercises) || !s.workout.exercises.length
        || Date.now() - s.savedAt > RESUME_MAX_AGE_MS) {
        clearSession();
        return false;
    }
    activeWorkout = s.workout;
    currentSet = s.currentSet;
    currentExIndex = Math.min(s.currentExIndex, activeWorkout.exercises.length - 1);
    currentPhase = s.currentPhase;
    timeLeft = s.timeLeft;
    requestWakeLock();
    showActiveView();
    setPausedUI(true);
    updateWorkoutUI();
    clearInterval(timerInterval);
    timerInterval = setInterval(timerTick, 1000);
    showToast('האימון שוחזר – לחץ "המשך אימון" כדי להמשיך');
    return true;
}

function startWorkoutInit(id) {
    initAudio();
    requestWakeLock();
    activeWorkout = window.workouts.find(x => x.id === id);
    if (!activeWorkout || activeWorkout.exercises.length === 0) return;

    showActiveView();

    currentSet = 1;
    currentExIndex = 0;
    setPausedUI(false);

    // זמן הכנה ראשוני של 5 שניות
    currentPhase = 'prep';
    timeLeft = 5; 
    updateWorkoutUI();

    clearInterval(timerInterval);
    timerInterval = setInterval(timerTick, 1000);
}

function timerTick() {
    if (isPaused) return;

    // עצירת טיימר אם השלב הוא עבודה והתרגיל מוגדר לפי חזרות
    if (currentPhase === 'work' && activeWorkout.exercises[currentExIndex].type === 'reps') {
        return;
    }

    timeLeft--;

    // צפצוף 3 שניות אחרונות לפני מעבר שלב
    if (timeLeft > 0 && timeLeft <= 3) {
        playSound('countdown');
    }

    if (timeLeft <= 0) {
        nextPhase();
    } else {
        updateWorkoutUI();
    }
}

function nextPhase() {
    if (currentPhase === 'prep') {
        // תחילת תרגיל ראשון בסט הראשון
        setPhase('work', activeWorkout.exercises[currentExIndex].workTime);
    } 
    else if (currentPhase === 'work') {
        const currentEx = activeWorkout.exercises[currentExIndex];
        if (currentEx.restTime > 0) {
            // מעבר למנוחה בין תרגילים
            setPhase('repRest', currentEx.restTime);
        } else {
            // מדלגים ישר לתרגיל הבא אם זמן המנוחה הוא 0
            moveToNextExercise();
        }
    } 
    else if (currentPhase === 'repRest') {
        moveToNextExercise();
    } 
    else if (currentPhase === 'setRest') {
        currentSet++;
        currentExIndex = 0;
        setPhase('work', activeWorkout.exercises[currentExIndex].workTime);
    }
}

function moveToNextExercise() {
    if (currentExIndex < activeWorkout.exercises.length - 1) {
        // מעבר לתרגיל הבא באותו הסט
        currentExIndex++;
        setPhase('work', activeWorkout.exercises[currentExIndex].workTime);
    } else {
        // סיימנו את כל התרגילים בסט הנוכחי
        if (currentSet < activeWorkout.sets) {
            // מעבר למנוחה בין סטים
            if (activeWorkout.setRest > 0) {
                setPhase('setRest', activeWorkout.setRest);
            } else {
                currentSet++;
                currentExIndex = 0;
                setPhase('work', activeWorkout.exercises[currentExIndex].workTime);
            }
        } else {
            // סיימנו את כל הסטים והאימון הושלם!
            finishWorkout();
        }
    }
}

function setPhase(newPhase, time) {
    currentPhase = newPhase;
    timeLeft = time;

    if (newPhase === 'work') {
        playSound('startWork');
    } else {
        playSound('startRest');
    }

    updateWorkoutUI();
}

function updateWorkoutUI() {
    saveSession();
    const currentEx = activeWorkout.exercises[currentExIndex];

    // עדכון תגים
    document.getElementById('activeSetBadge').innerText = `סט ${currentSet} מתוך ${activeWorkout.sets}`;
    document.getElementById('activeExIndexBadge').innerText = `תרגיל ${currentExIndex + 1} מתוך ${activeWorkout.exercises.length}`;

    const viewEl = document.getElementById('activeWorkoutView');
    const titleEl = document.getElementById('phaseTitle');
    const exNameEl = document.getElementById('activeExerciseName');
    const nextEl = document.getElementById('nextExerciseDisplay');

    // איפוס קלאסים של רקע
    viewEl.classList.remove('bg-work', 'bg-rest', 'bg-slate-900');

    // איפוס כפתורים מיוחדים
    document.getElementById('btnDone').classList.add('hidden');
    document.getElementById('btnPause').classList.remove('hidden');

    if (currentPhase === 'prep') {
        viewEl.classList.add('bg-slate-900');
        titleEl.innerText = "התכונן להפעלת אימון...";
        exNameEl.innerText = currentEx.name;
        document.getElementById('mainTimer').innerText = formatTime(timeLeft);
        nextEl.innerText = `תרגיל 1: ${currentEx.name}`;
    } 
    else if (currentPhase === 'work') {
        viewEl.classList.add('bg-work');
        exNameEl.innerText = currentEx.name;

        if (currentEx.type === 'reps') {
            titleEl.innerText = "בצע חזרות!";
            document.getElementById('mainTimer').innerText = currentEx.repsCount;
            document.getElementById('btnDone').classList.remove('hidden');
            document.getElementById('btnPause').classList.add('hidden');
        } else {
            titleEl.innerText = "זמן עבודה!";
            document.getElementById('mainTimer').innerText = formatTime(timeLeft);
        }

        if (currentExIndex < activeWorkout.exercises.length - 1) {
            nextEl.innerText = `התרכז בתרגיל | הבא בתור: ${activeWorkout.exercises[currentExIndex + 1].name}`;
        } else if (currentSet < activeWorkout.sets) {
            nextEl.innerText = `תרגיל אחרון בסט! | הבא בתור: מנוחה בין סטים`;
        } else {
            nextEl.innerText = `תרגיל אחרון באימון! תן הכל!`;
        }
    } 
    else if (currentPhase === 'repRest') {
        viewEl.classList.add('bg-rest');
        titleEl.innerText = "זמן מנוחה";
        exNameEl.innerText = "לנשום עמוק ולהירגע";
        document.getElementById('mainTimer').innerText = formatTime(timeLeft);

        if (currentExIndex < activeWorkout.exercises.length - 1) {
            nextEl.innerText = `תרגיל הבא: ${activeWorkout.exercises[currentExIndex + 1].name}`;
        } else {
            nextEl.innerText = `התרגיל הבא: מנוחת סטים`;
        }
    } 
    else if (currentPhase === 'setRest') {
        viewEl.classList.add('bg-rest');
        titleEl.innerText = `מנוחה בין סטים (לפני סט ${currentSet + 1})`;
        exNameEl.innerText = "שתה מים והתכונן";
        document.getElementById('mainTimer').innerText = formatTime(timeLeft);
        nextEl.innerText = `בסט הבא מתחילים ב: ${activeWorkout.exercises[0].name}`;
    }
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function markRepDone() {
    const currentEx = activeWorkout.exercises[currentExIndex];
    if (currentEx && currentEx.restTime > 0) {
        setPhase('repRest', currentEx.restTime);
    } else {
        moveToNextExercise();
    }
}

function togglePause() {
    setPausedUI(!isPaused);
}

function stopWorkout() {
    clearInterval(timerInterval);
    clearSession();
    releaseWakeLock();
    isPaused = false;
    document.getElementById('activeWorkoutView').className = "hidden fixed inset-0 z-50 flex flex-col justify-between transition-colors duration-500 bg-slate-900 text-white pb-8";
    showList();
}

function finishWorkout() {
    clearInterval(timerInterval);
    clearSession();
    releaseWakeLock();
    playSound('finish');

    const viewEl = document.getElementById('activeWorkoutView');
    viewEl.classList.remove('bg-work', 'bg-rest', 'bg-slate-900');
    viewEl.classList.add('bg-blue-600');

    document.getElementById('phaseTitle').innerText = "האימון הושלם בהצלחה! 🎉";
    document.getElementById('activeExerciseName').innerText = "כל הכבוד!";
    document.getElementById('mainTimer').innerText = "00:00";
    document.getElementById('nextExerciseDisplay').innerText = "חוזר לרשימת האימונים...";

    setTimeout(() => { stopWorkout(); }, 4000);
}

// בדיקת תפוגה גם כשהאפליקציה פתוחה (לא באמצע אימון)
function resetIfLocalExpired() {
    if (!isLocalExpired() || !document.getElementById('activeWorkoutView').classList.contains('hidden')) return;
    window.workouts = JSON.parse(JSON.stringify(defaultWorkouts));
    localStorage.setItem('workout_app_workouts', JSON.stringify(window.workouts));
    startLocalPeriod();
    if (!document.getElementById('listView').classList.contains('hidden')) renderList();
    showToast('עבר שבוע – הזיכרון המקומי אופס');
}
setInterval(resetIfLocalExpired, 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) resetIfLocalExpired(); });

// טעינה ראשונית של הרשימה
renderList();
updateExpiryNote();
resumeSession();

// פונקציות שנקראות מתוך ה-HTML (onclick)
Object.assign(window, {
    toggleFullscreen, showList, openForm, addExerciseInput, toggleExType, saveWorkout,
    deleteWorkout, startWorkoutInit, markRepDone, togglePause, stopWorkout, isWorkoutActive,
});
