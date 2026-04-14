import { useState, useCallback, useRef, useEffect } from 'react'

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'stackweeks_v1'
const START_DATE = '2026-03-23'
const TOTAL_DAYS = 91

const COLORS = {
  primary: '#004AAD',
  dark: '#002D6B',
  gold: '#C9A84C',
  bg: '#F8F8F6',
  stone: '#F0EDE6',
  mist: '#E2DDD6',
  ink: '#1A1F2E',
  slate: '#7A8090',
  white: '#FFFFFF',
}

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif"

const PERIODIC_HABIT_IDS = ['meal_prep', 'weekly_check', 'therapy', 'cortisone']
const HIGH_PRIORITY_HABIT_IDS = ['workout', 'macros', 'water', 'no_alcohol', 'no_sex']
const HABIT_WEIGHT = (id: string): number => HIGH_PRIORITY_HABIT_IDS.includes(id) ? 3 : 1

const STEPS_TIERS = [
  { id: 'under3k', label: 'Under 3K', emoji: '🔴', score: 0 },
  { id: '3k5k', label: '3K–5K', emoji: '🟡', score: 0.25 },
  { id: '5k7k', label: '5K–7.5K', emoji: '🟠', score: 0.5 },
  { id: '7k10k', label: '7.5K–10K', emoji: '🟢', score: 0.75 },
  { id: '10kplus', label: '10K+', emoji: '⭐', score: 1.0 },
]

// ─── Types ───────────────────────────────────────────────────────────────────

interface HabitDef {
  id: string
  label: string
  desc: string
  emoji: string
  category: string
  weeklyTarget?: number
}

interface WorkoutExercise {
  name: string
  sets: string
  rest: string
  note?: string
  noWeight?: boolean
  logType?: 'rounds' | 'duration' | 'checkbox'
  formUrl?: string
}

interface WorkoutDay {
  day: string
  title: string
  exercises: WorkoutExercise[]
}

interface WeeklyLog {
  week: number
  date: string
  weight: string
  bodyFat: string
  notes: string
}

interface AudioLog {
  weekNum: number
  date: string
  duration: number
  audio: string
  transcript?: string
  notes?: string
}

interface AppData {
  habits: Record<string, Record<string, boolean>>
  workoutLogs: Record<string, Record<string, string>>
  weeklyLogs: WeeklyLog[]
  nutritionLogs: Record<string, { calories: string; protein: string; carbs: string; fat: string }>
  stepsRanges: Record<string, string>
  audioLogs: Record<string, AudioLog>
}

// ─── Habits (Section 1a — ordered morning → night) ───────────────────────────

const HABITS: HabitDef[] = [
  { id: 'prayer',        label: 'Morning Prayer',         desc: 'First thing in the morning',            emoji: '🙏🏾', category: 'MINDSET' },
  { id: 'invisalign',    label: 'Invisalign',             desc: 'Worn overnight — log in the morning',   emoji: '🦷',  category: 'RECOVERY' },
  { id: 'meditation',    label: '5 Min Meditation',       desc: 'Daily — morning or before bed',         emoji: '🧘🏾', category: 'MINDSET' },
  { id: 'skin',          label: 'Skin Routine',           desc: 'AM + PM routine complete',              emoji: '✨',  category: 'RECOVERY' },
  { id: 'vitamins',      label: 'Vitamins + Supplements', desc: 'With first or second meal',             emoji: '💊',  category: 'RECOVERY' },
  { id: 'workout',       label: 'Workout',                desc: "Log today's session",                   emoji: '⚡',  category: 'FITNESS',  weeklyTarget: 5 },
  { id: 'no_hiphop',     label: 'No Hip-Hop Before 1PM',  desc: 'Intentional morning audio',             emoji: '🎵',  category: 'MINDSET' },
  { id: 'invest',        label: 'Invest ($$)',            desc: 'Daily financial action taken',          emoji: '💰',  category: 'MINDSET' },
  { id: 'water',         label: '1 Gallon Water',         desc: '~3.8L throughout the day',              emoji: '💧',  category: 'NUTRITION' },
  { id: 'no_snacking',   label: 'No Reckless Snacking',   desc: 'Intentional eating only',               emoji: '🍪',  category: 'DISCIPLINE' },
  { id: 'no_porn',       label: 'No Porn',                desc: 'Log before bed',                        emoji: '🚫',  category: 'DISCIPLINE' },
  { id: 'no_sex',        label: 'No Sex',                 desc: 'Log before bed',                        emoji: '⛔',  category: 'DISCIPLINE' },
  { id: 'no_alcohol',    label: 'No Alcohol',             desc: 'Log before bed',                        emoji: '🍷',  category: 'DISCIPLINE' },
  { id: 'steps',         label: '10K Steps',              desc: 'Log your step range for today',         emoji: '👟',  category: 'FITNESS' },
  { id: 'macros',        label: 'Hit Macros',             desc: '200g protein + calorie target',         emoji: '🥗',  category: 'NUTRITION' },
  { id: 'no_eat_after_9',label: 'No Eating After 9PM',   desc: 'Fasting window maintained',             emoji: '🕗',  category: 'NUTRITION' },
  { id: 'bed_1030',      label: 'In Bed by 10:30PM',      desc: 'Screens off, lights down',              emoji: '🌙',  category: 'RECOVERY' },
  { id: 'sleep_7h',      label: '7 Hours Sleep',          desc: 'Log upon waking',                       emoji: '😴',  category: 'RECOVERY' },
  // Periodic Goals (Section 1b)
  { id: 'meal_prep',     label: 'Meal Prep',              desc: 'Weekly — log when complete',            emoji: '🍱',  category: 'NUTRITION' },
  { id: 'weekly_check',  label: 'Weekly Progress Check',  desc: 'Photo, weight, body fat',               emoji: '📸',  category: 'TRACKING' },
  { id: 'therapy',       label: 'Therapy Session',        desc: 'Biweekly — log when done',              emoji: '🛋️', category: 'MINDSET' },
  { id: 'cortisone',     label: 'Cortisone Injection',    desc: 'Once a month — log when done',          emoji: '💉',  category: 'RECOVERY' },
]

// ─── Workout Program (Section 4a — removed DB Rear Delt Fly; 4b — noWeight; 4c — Incline DB Curl; 4h — formUrls) ─

const WORKOUT_DAYS: WorkoutDay[] = [
  {
    day: 'Monday', title: 'Push (Chest & Triceps) · Core Day 1 of 3', exercises: [
      { name: 'Push-Up Warm-Up',            sets: '2×15–20',              rest: '30 sec',      note: 'Activation only. Not a working set.',                                                                                                                                                                                            noWeight: true, logType: 'checkbox', formUrl: 'https://www.youtube.com/results?search_query=push+up+proper+form' },
      { name: 'Incline DB Bench Press',     sets: '4×6–10',               rest: '2.5–4 min',   note: '30° incline, neutral grip, north-to-south press. Do not flare elbows.',                                                                                                                                                          formUrl: 'https://www.youtube.com/results?search_query=incline+dumbbell+bench+press+proper+form' },
      { name: 'Pec Deck Machine Flys',      sets: '3×10–12',              rest: '60–90 sec',   note: 'Full ROM, constant tension.',                                                                                                                                                                                                    formUrl: 'https://www.youtube.com/results?search_query=pec+deck+fly+proper+form' },
      { name: 'Single-Arm DB Floor Press',  sets: '3×10–12 each',         rest: '60–90 sec',   note: 'Limited ROM protects the labrum.',                                                                                                                                                                                               formUrl: 'https://www.youtube.com/results?search_query=single+arm+dumbbell+floor+press+form' },
      { name: 'Cable Triceps Rope Pushdown',sets: '3×10–12',              rest: '60–90 sec',   note: 'Elbows fixed at sides.',                                                                                                                                                                                                         formUrl: 'https://www.youtube.com/results?search_query=cable+triceps+rope+pushdown+form' },
      { name: 'DB Skull Crushers',          sets: '3×12–15',              rest: '60 sec',      note: 'Floor or flat bench. Lower slowly to temples.',                                                                                                                                                                                  formUrl: 'https://www.youtube.com/results?search_query=dumbbell+skull+crushers+proper+form' },
      { name: 'Ab Circuit',                 sets: '3 rounds',             rest: '—',           note: 'Plank 45–60s / Leg Raises 12–15 / Crunches 15–20. Core finisher — do last.',                                                                                                    noWeight: true, logType: 'rounds',   formUrl: 'https://www.youtube.com/results?search_query=ab+circuit+core+workout+form' },
    ]
  },
  {
    day: 'Tuesday', title: 'Legs (Quad Dominant)', exercises: [
      { name: 'Push-Up Warm-Up',            sets: '2×15–20',              rest: '30 sec',      note: 'Activation only before leg session.',                                                                                                                                                                                            noWeight: true, logType: 'checkbox', formUrl: 'https://www.youtube.com/results?search_query=push+up+proper+form' },
      { name: 'Hack Squat Machine',         sets: '4×8–10',               rest: '2.5–4 min',   note: 'Feet shoulder-width, toes slightly out. Control descent.',                                                                                                                                                                       formUrl: 'https://www.youtube.com/results?search_query=hack+squat+machine+proper+form' },
      { name: 'Leg Press',                  sets: '3×10–12',              rest: '2–3 min',     note: 'Full ROM. Do not lock out at top.',                                                                                                                                                                                              formUrl: 'https://www.youtube.com/results?search_query=leg+press+proper+form' },
      { name: 'DB Lunge In Place',          sets: '3×10–12 each',         rest: '2 min',       note: '90° at both knees at bottom.',                                                                                                                                                                                                   formUrl: 'https://www.youtube.com/results?search_query=dumbbell+lunge+proper+form' },
      { name: 'Leg Extension',              sets: '3×10–12',              rest: '60–90 sec',   note: '1-sec hold at full extension.',                                                                                                                                                                                                  formUrl: 'https://www.youtube.com/results?search_query=leg+extension+machine+proper+form' },
      { name: 'Seated Calf Raises',         sets: '3×12–15',              rest: '60 sec',      note: 'Full stretch at bottom, full contraction at top.',                                                                                                                                                                               formUrl: 'https://www.youtube.com/results?search_query=seated+calf+raise+proper+form' },
      { name: 'Stairmaster Finisher',       sets: '8–10 min',             rest: '—',           note: 'Moderate pace. Active recovery.',                                                                                                                                  noWeight: true, logType: 'duration', formUrl: 'https://www.youtube.com/results?search_query=stairmaster+proper+form+technique' },
    ]
  },
  {
    day: 'Wednesday', title: 'PT + Core + Conditioning · Core Day 2 of 3', exercises: [
      { name: 'Physical Therapy',           sets: '15–20 min',            rest: '—',           note: 'NON-NEGOTIABLE. Primary focus of this day. Never cut this.',                                                                                                    noWeight: true, logType: 'duration', formUrl: 'https://www.youtube.com/results?search_query=shoulder+labrum+physical+therapy+exercises' },
      { name: 'Ab Circuit',                 sets: '3 rounds',             rest: '—',           note: 'Plank 45–60s / Leg Raises 12–15 / Crunches 15–20.',                                                                                                            noWeight: true, logType: 'rounds',   formUrl: 'https://www.youtube.com/results?search_query=ab+circuit+core+workout+form' },
      { name: 'Farmers Carry',              sets: '3×120–160 steps',      rest: '90 sec',      note: '50–70 lbs/hand. Upright posture. Grip + core. Minimal shoulder stress.',                                                                                                       noWeight: true, logType: 'rounds',   formUrl: 'https://www.youtube.com/results?search_query=farmers+carry+proper+form' },
      { name: 'Jump Rope Intervals',        sets: '3×2 min on/60 sec off',rest: '—',           note: 'Alt: 15–20 min Stairmaster moderate-high.',                                                                                                                     noWeight: true, logType: 'rounds',   formUrl: 'https://www.youtube.com/results?search_query=jump+rope+proper+form+technique' },
    ]
  },
  {
    day: 'Thursday', title: 'Pull (Back & Biceps) · Core Day 3 of 3', exercises: [
      { name: 'Push-Up Warm-Up',            sets: '2×15–20',              rest: '30 sec',      note: 'Activation only.',                                                                                                                                              noWeight: true, logType: 'checkbox', formUrl: 'https://www.youtube.com/results?search_query=push+up+proper+form' },
      { name: 'One-Arm DB Row',             sets: '4×8–12 each',          rest: '2.5–3 min',   note: 'Drive elbow back and up. Full stretch at bottom.',                                                                                                              formUrl: 'https://www.youtube.com/results?search_query=one+arm+dumbbell+row+proper+form' },
      { name: 'Seated Cable Row Close Grip',sets: '3×8–12',               rest: '2–3 min',     note: 'Torso upright — no momentum. Pull to lower sternum.',                                                                                                           formUrl: 'https://www.youtube.com/results?search_query=seated+cable+row+proper+form' },
      { name: 'Lat Pulldown Wide Grip',     sets: '3×10–12',              rest: '2 min',       note: 'Pull to upper chest. Lean back ~10–15°. Builds V-taper.',                                                                                                       formUrl: 'https://www.youtube.com/results?search_query=lat+pulldown+wide+grip+proper+form' },
      { name: 'Barbell Curl 90/90/180',     sets: '3×8–10',               rest: '90 sec',      note: 'Partial ranges before full reps. No elbow swing.',                                                                                                              formUrl: 'https://www.youtube.com/results?search_query=barbell+curl+proper+form' },
      { name: 'Incline DB Curl',            sets: '3×10–12',              rest: '60–90 sec',   note: 'Use a 30° angled bench. Full stretch at bottom. Priority biceps movement.',                                                                                     formUrl: 'https://www.youtube.com/results?search_query=incline+dumbbell+curl+proper+form+30+degree' },
      { name: 'Ab Circuit',                 sets: '3 rounds',             rest: '—',           note: 'Plank 45–60s / Leg Raises 12–15 / Crunches 15–20. Core finisher — do last.',                                                                                                    noWeight: true, logType: 'rounds',   formUrl: 'https://www.youtube.com/results?search_query=ab+circuit+core+workout+form' },
    ]
  },
  {
    day: 'Friday', title: 'Legs (Posterior Chain) + Biceps + Lateral Delts', exercises: [
      { name: 'Hip Hinge Warm-Up',          sets: '2×10–12',              rest: '30 sec',      note: 'Light Romanian deadlift or band pull-through. Activates posterior chain before trap bar. Do NOT use push-ups here — anterior fatigue before heavy hinging is counterproductive.', noWeight: true, logType: 'checkbox', formUrl: 'https://www.youtube.com/results?search_query=romanian+deadlift+hip+hinge+form' },
      { name: 'Trap Bar Deadlift',          sets: '4×6–8',                rest: '3–4 min',     note: 'Primary compound. Neutral grip, flat back, drive through heels.',                                                                                                               formUrl: 'https://www.youtube.com/results?search_query=trap+bar+deadlift+proper+form' },
      { name: 'Seated Leg Curl',            sets: '3×10–12',              rest: '90 sec',      note: '1-sec pause at full contraction.',                                                                                                                               formUrl: 'https://www.youtube.com/results?search_query=seated+leg+curl+machine+proper+form' },
      { name: 'Bulgarian Split Squat DB',   sets: '3×10–12 each',         rest: '2 min',       note: 'Rear foot on bench. Front shin near-vertical at bottom.',                                                                                                        formUrl: 'https://www.youtube.com/results?search_query=bulgarian+split+squat+dumbbell+form' },
      { name: 'Standing Calf Raises',       sets: '3×12–15',              rest: '60 sec',      note: 'Full ROM.',                                                                                                                                                      formUrl: 'https://www.youtube.com/results?search_query=standing+calf+raise+proper+form' },
      { name: 'Hammer Curls',               sets: '3×10–12',              rest: '60–90 sec',   note: 'Neutral grip. Targets brachialis — arm thickness.',                                                                                                             formUrl: 'https://www.youtube.com/results?search_query=hammer+curl+proper+form' },
      { name: 'Reverse Barbell Curl',       sets: '2×10–12',              rest: '60 sec',      note: 'Overhand grip. Brachioradialis and forearms.',                                                                                                                  formUrl: 'https://www.youtube.com/results?search_query=reverse+barbell+curl+proper+form' },
      { name: 'Cable Lateral Raises',       sets: '3×12–15',              rest: '60–90 sec',   note: 'Moved from Wednesday. Slight forward lean. +2.5 lbs only. STOP immediately if shoulder pain. Only direct lateral delt work in the program.',                    formUrl: 'https://www.youtube.com/results?search_query=cable+lateral+raise+proper+form' },
    ]
  },
  {
    day: 'Saturday', title: 'Optional Active Recovery', exercises: [
      { name: 'Basketball / Barre / Yoga / Walk', sets: '30–60 min', rest: '—', note: 'No warm-up required.', noWeight: true, logType: 'duration' },
    ]
  },
  { day: 'Sunday', title: 'Full Rest + Weekly Audio Diary', exercises: [] },
]

// ─── Meal Plans (Section 5a — updated Meal 1 for Vega Sport) ─────────────────

const MEALS = [
  {
    name: 'Meal 1 — Oatmeal + Eggs',
    timing: 'First meal',
    items: '80g dry oats, 1 tbsp peanut butter (16g), 100g blueberries, 1 scoop Vega Sport protein powder, 2 whole eggs',
    macros: '52g protein | 65g carbs | 20g fat | ~620 kcal',
    note: 'Protein powder: Vega Sport (30g protein / scoop)',
  },
  {
    name: 'Meal 2 — Ground Turkey Quinoa Bowl',
    timing: 'Lunch',
    items: '170g cooked ground turkey 93% lean, 120g cooked quinoa, 100g broccoli, 50g spinach',
    macros: '52g protein | 40g carbs | 14g fat | ~470 kcal',
    note: undefined,
  },
  {
    name: 'Meal 3 — Salmon Rice Bowl',
    timing: 'Dinner',
    items: '1 can salmon 150g drained, 150g cooked brown rice, 150g sweet potato, 100g spinach or broccoli',
    macros: '45g protein | 55g carbs | 12g fat | ~520 kcal',
    note: undefined,
  },
  {
    name: 'Snack — Protein Shake',
    timing: 'Anytime',
    items: '1 scoop protein powder, 240ml almond milk, 1 banana, optional 28g Skinny Pop',
    macros: '30g protein | 43g carbs | 7g fat | ~350 kcal',
    note: undefined,
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dateStr(d: Date): string { return getLocalDateKey(d) }
function today(): string { return getLocalDateKey() }

function getDayNumber(): number {
  const start = new Date(START_DATE + 'T12:00:00')
  const now = new Date(today() + 'T12:00:00')
  const diff = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return Math.max(0, Math.min(diff + 1, TOTAL_DAYS))
}

function getWeekNumber(): number { return Math.ceil(getDayNumber() / 7) }

function getPhase(): { phase: number; name: string; weeks: string } {
  const w = getWeekNumber()
  if (w <= 8) return { phase: 1, name: 'Foundation', weeks: '1–8' }
  return { phase: 2, name: 'Build', weeks: '9–13' }
}

function getWeekDates(dateString: string): string[] {
  const d = new Date(dateString + 'T12:00:00')
  const dayOfWeek = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7))
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
    dates.push(dateStr(dd))
  }
  return dates
}

function getDayOfWeekName(dateString: string): string {
  return new Date(dateString + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
}

// Section 2a: weighted completion — steps excluded, periodic excluded
function getWeightedPct(habitsForDay: Record<string, boolean>): number {
  const dailyHabits = HABITS.filter(h => !PERIODIC_HABIT_IDS.includes(h.id) && h.id !== 'steps')
  const totalWeight = dailyHabits.reduce((sum, h) => sum + HABIT_WEIGHT(h.id), 0)
  const doneWeight = dailyHabits.filter(h => habitsForDay?.[h.id]).reduce((sum, h) => sum + HABIT_WEIGHT(h.id), 0)
  return totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0
}

function getStreak(data: AppData): number {
  let streak = 0
  const d = new Date(today() + 'T12:00:00')
  if (getWeightedPct(data.habits[today()] || {}) < 70) d.setDate(d.getDate() - 1)
  while (true) {
    const ds = dateStr(d)
    if (ds < START_DATE) break
    if (getWeightedPct(data.habits[ds] || {}) >= 70) { streak++; d.setDate(d.getDate() - 1) }
    else break
  }
  return streak
}

// Section 2b: individual streaks
function getIndividualStreak(data: AppData, habitId: string): { current: number; best: number } {
  let current = 0
  const d = new Date(today() + 'T12:00:00')
  if (data.habits[today()]?.[habitId]) { current = 1; d.setDate(d.getDate() - 1) }
  else d.setDate(d.getDate() - 1)
  while (true) {
    const ds = dateStr(d)
    if (ds < START_DATE) break
    if (data.habits[ds]?.[habitId]) { current++; d.setDate(d.getDate() - 1) } else break
  }

  let best = current
  let tempStreak = 0
  let prevDate: string | null = null
  for (const dateKey of Object.keys(data.habits).sort()) {
    if (data.habits[dateKey]?.[habitId]) {
      if (prevDate) {
        const diff = Math.round((new Date(dateKey + 'T12:00:00').getTime() - new Date(prevDate + 'T12:00:00').getTime()) / 86400000)
        tempStreak = diff === 1 ? tempStreak + 1 : 1
      } else { tempStreak = 1 }
      prevDate = dateKey
      best = Math.max(best, tempStreak)
    } else { tempStreak = 0; prevDate = null }
  }
  return { current, best }
}

function getWorkoutWeeks(data: AppData): boolean[] {
  return Array.from({ length: 13 }, (_, wi) => {
    let count = 0
    for (let di = 0; di < 7; di++) {
      const d = new Date(START_DATE + 'T12:00:00')
      d.setDate(d.getDate() + wi * 7 + di)
      if (data.habits[getLocalDateKey(d)]?.workout) count++
    }
    return count >= 5
  })
}

function sanitizeExerciseName(name: string): string {
  return name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

// Section 4d/4f: workout history helpers — name-based storage keys
function getAllSessionsForExercise(
  data: AppData, exerciseName: string, dayOfWeek: number, beforeDate?: string
): { date: string; sets: { weight: string; reps: string }[] }[] {
  const sanitized = sanitizeExerciseName(exerciseName)
  const sessions: { date: string; sets: { weight: string; reps: string }[] }[] = []
  for (const dateKey of Object.keys(data.workoutLogs).sort()) {
    if (beforeDate && dateKey >= beforeDate) continue
    if (new Date(dateKey + 'T12:00:00').getDay() !== dayOfWeek) continue
    const logs = data.workoutLogs[dateKey] || {}
    const sets: { weight: string; reps: string }[] = []
    for (let si = 0; si < 10; si++) {
      const w = logs[`${sanitized}-${si}-w`]
      const r = logs[`${sanitized}-${si}-r`]
      if (w || r) sets.push({ weight: w || '', reps: r || '' }); else break
    }
    if (sets.length > 0) sessions.push({ date: dateKey, sets })
  }
  return sessions.reverse()
}


function fmtDate(dateKey: string): string {
  return new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Section 3: weekly step score
function getWeeklyStepScore(stepsRanges: Record<string, string>, weekDates: string[]): number {
  const scores = weekDates.map(d => {
    const tier = STEPS_TIERS.find(t => t.id === stepsRanges[d])
    return tier ? tier.score : 0
  })
  const logged = weekDates.filter(d => stepsRanges[d])
  if (logged.length === 0) return 0
  return Math.round((scores.reduce((a, b) => a + b, 0) / weekDates.length) * 100)
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const EMPTY_DATA: AppData = {
  habits: {}, workoutLogs: {}, weeklyLogs: [], nutritionLogs: {}, stepsRanges: {}, audioLogs: {},
}

function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

// Migrate old index-based keys and audit for unknown keys
function migrateAndAuditWorkoutLogs(data: AppData): { data: AppData; clearedDates: string[] } {
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const knownNames = new Set<string>()
  WORKOUT_DAYS.forEach(wd => wd.exercises.forEach(ex => knownNames.add(sanitizeExerciseName(ex.name))))

  const clearedDates: string[] = []
  const newWorkoutLogs: Record<string, Record<string, string>> = {}
  const quarantine: Record<string, Record<string, string>> = {}

  for (const [dateKey, logs] of Object.entries(data.workoutLogs)) {
    const hasOldFormat = Object.keys(logs).some(k => /^\d+-/.test(k))

    if (!hasOldFormat) {
      // Audit: quarantine any keys that don't match known exercises or special fields
      const clean: Record<string, string> = {}
      const bad: Record<string, string> = {}
      for (const [key, value] of Object.entries(logs)) {
        if (key === 'locked') { clean[key] = value; continue }
        const isKnown = [...knownNames].some(n => key === `${n}-done` || key === `${n}-rounds` || key === `${n}-duration` || key === `${n}-notes` || /^-\d+-[wr]$/.test(key.slice(n.length)) && key.startsWith(n))
        if (isKnown) { clean[key] = value } else { bad[key] = value }
      }
      newWorkoutLogs[dateKey] = clean
      if (Object.keys(bad).length > 0) {
        quarantine[dateKey] = bad
        console.warn(`[Stack Weeks Audit] Quarantined ${Object.keys(bad).length} unknown keys from ${dateKey}`)
      }
      continue
    }

    // Attempt migration from old index-based format
    const dow = new Date(dateKey + 'T12:00:00').getDay()
    const workoutDay = WORKOUT_DAYS.find(w => w.day === DAYS[dow])
    if (!workoutDay || workoutDay.exercises.length === 0) {
      clearedDates.push(dateKey)
      console.warn(`[Stack Weeks Migration] Cleared ${dateKey} — no workout mapping for that day`)
      continue
    }

    const newLogs: Record<string, string> = {}
    let ok = true
    const getEx = (i: string) => workoutDay.exercises[parseInt(i)]

    for (const [key, value] of Object.entries(logs)) {
      if (key === 'locked') { newLogs[key] = value; continue }
      let m: RegExpMatchArray | null
      if ((m = key.match(/^(\d+)-(\d+)-w$/))) {
        const ex = getEx(m[1]); if (ex) newLogs[`${sanitizeExerciseName(ex.name)}-${m[2]}-w`] = value; else ok = false
      } else if ((m = key.match(/^(\d+)-(\d+)-r$/))) {
        const ex = getEx(m[1]); if (ex) newLogs[`${sanitizeExerciseName(ex.name)}-${m[2]}-r`] = value; else ok = false
      } else if ((m = key.match(/^(\d+)-done$/))) {
        const ex = getEx(m[1]); if (ex) newLogs[`${sanitizeExerciseName(ex.name)}-done`] = value; else ok = false
      } else if ((m = key.match(/^(\d+)-rounds$/))) {
        const ex = getEx(m[1]); if (ex) newLogs[`${sanitizeExerciseName(ex.name)}-rounds`] = value; else ok = false
      } else if ((m = key.match(/^(\d+)-duration$/))) {
        const ex = getEx(m[1]); if (ex) newLogs[`${sanitizeExerciseName(ex.name)}-duration`] = value; else ok = false
      } else if ((m = key.match(/^(\d+)-notes$/))) {
        const ex = getEx(m[1]); if (ex) newLogs[`${sanitizeExerciseName(ex.name)}-notes`] = value; else ok = false
      } else { newLogs[key] = value }
    }

    if (!ok) {
      clearedDates.push(dateKey)
      console.warn(`[Stack Weeks Migration] Cleared ${dateKey} — exercise index out of range`)
    } else {
      newWorkoutLogs[dateKey] = newLogs
    }
  }

  if (Object.keys(quarantine).length > 0) {
    try {
      const existing = JSON.parse(localStorage.getItem('workoutLogs_quarantine') || '{}')
      localStorage.setItem('workoutLogs_quarantine', JSON.stringify({ ...existing, ...quarantine }))
    } catch { /* non-fatal */ }
  }

  const totalDates = Object.keys(data.workoutLogs).length
  console.log(`[Stack Weeks Audit] ${totalDates} dates audited. Cleared: ${clearedDates.length}. Quarantined batches: ${Object.keys(quarantine).length}`)
  return { data: { ...data, workoutLogs: newWorkoutLogs }, clearedDates }
}

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_DATA }
    const parsed = JSON.parse(raw)
    let appData: AppData = { ...EMPTY_DATA, ...parsed, stepsRanges: parsed.stepsRanges || {}, audioLogs: parsed.audioLogs || {} }
    const { data: migrated, clearedDates } = migrateAndAuditWorkoutLogs(appData)
    appData = migrated
    if (clearedDates.length > 0) localStorage.setItem('sw_migration_cleared', 'true')
    saveData(appData)
    return appData
  } catch { return { ...EMPTY_DATA } }
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: COLORS.white,
  borderRadius: 16,
  padding: '16px',
  marginBottom: 12,
  boxShadow: '0 2px 8px rgba(0,74,173,0.06)',
  border: `1px solid ${COLORS.mist}`,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.2,
  textTransform: 'uppercase' as const,
  color: COLORS.slate,
  marginBottom: 8,
  marginTop: 16,
  fontFamily: FONT,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: `1px solid ${COLORS.mist}`,
  fontSize: 15,
  fontFamily: FONT,
  color: COLORS.ink,
  background: COLORS.stone,
  outline: 'none',
}

// ─── App ──────────────────────────────────────────────────────────────────────

function HeaderLogo() {
  const [err, setErr] = useState(false)
  if (err) return <span style={{ fontSize: 15, fontWeight: 800, color: COLORS.white, letterSpacing: 0.5, textTransform: 'uppercase' }}>stack weeks</span>
  return <img src="/stack_weeks_logo_transparent.png" style={{ height: 22, width: 'auto' }} alt="Stack Weeks" onError={() => setErr(true)} />
}

export default function App() {
  const [tab, setTab] = useState<'today' | 'workout' | 'nutrition' | 'progress' | 'plan'>('today')
  const [data, setData] = useState<AppData>(loadData)
  const [selectedDate, setSelectedDate] = useState(today())
  // Section 8b: lift workout expanded state to prevent loss on tab switch
  const todayDayName = getDayOfWeekName(today())
  const [workoutExpandedDay, setWorkoutExpandedDay] = useState<string | null>(todayDayName)
  const [nutritionExpandedMeal, setNutritionExpandedMeal] = useState<number | null>(null)
  const [showMigrationBanner, setShowMigrationBanner] = useState(() => {
    const val = localStorage.getItem('sw_migration_cleared')
    if (val === 'true') { localStorage.removeItem('sw_migration_cleared'); return true }
    return false
  })

  const updateData = useCallback((updater: (prev: AppData) => AppData) => {
    setData(prev => {
      const next = updater(prev)
      saveData(next)
      return next
    })
  }, [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: FONT, background: COLORS.bg }}>
      <div style={{ background: COLORS.primary, flexShrink: 0 }}>
        <div style={{ padding: '12px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <HeaderLogo />
          <div style={{ fontSize: 12, color: COLORS.gold, fontWeight: 700, letterSpacing: 0.3 }}>
            Day {getDayNumber()} / {TOTAL_DAYS} — Phase {getPhase().phase}
          </div>
        </div>
        <div style={{ height: 3, background: `${COLORS.gold}40` }}>
          <div style={{ height: '100%', width: `${(getDayNumber() / TOTAL_DAYS) * 100}%`, background: COLORS.gold, transition: 'width 0.5s' }} />
        </div>
      </div>

      {showMigrationBanner && (
        <div style={{ background: '#FEF3C7', borderBottom: '1px solid #F59E0B', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
            Some older workout data was cleared due to a storage format update. We're sorry for the inconvenience — this won't happen again.
          </span>
          <button onClick={() => setShowMigrationBanner(false)} style={{ flexShrink: 0, background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#92400E', padding: 0 }}>✕</button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 16px 16px', WebkitOverflowScrolling: 'touch' }}>
        {tab === 'today'     && <TodayTab data={data} updateData={updateData} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />}
        {tab === 'workout'   && <WorkoutTab data={data} updateData={updateData} expandedDay={workoutExpandedDay} setExpandedDay={setWorkoutExpandedDay} />}
        {tab === 'nutrition' && <NutritionTab data={data} updateData={updateData} expandedMeal={nutritionExpandedMeal} setExpandedMeal={setNutritionExpandedMeal} />}
        {tab === 'progress'  && <ProgressTab data={data} updateData={updateData} />}
        {tab === 'plan'      && <PlanTab />}
      </div>

      <div style={{ display: 'flex', borderTop: `1px solid ${COLORS.mist}`, background: COLORS.white, paddingBottom: 'env(safe-area-inset-bottom)', flexShrink: 0 }}>
        {(['today','workout','nutrition','progress','plan'] as const).map((key, i) => {
          const icons = ['📋','💪','🥗','📈','📖']
          const labels = ['Today','Workout','Nutrition','Progress','Plan']
          return (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: '10px 4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600, fontFamily: FONT,
              color: tab === key ? COLORS.primary : COLORS.slate,
              borderTop: tab === key ? `2px solid ${COLORS.primary}` : '2px solid transparent',
              transition: 'color 0.2s',
            }}>
              <span style={{ fontSize: 20 }}>{icons[i]}</span>
              {labels[i]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── TODAY TAB ────────────────────────────────────────────────────────────────

function TodayTab({ data, updateData, selectedDate, setSelectedDate }: {
  data: AppData; updateData: (fn: (p: AppData) => AppData) => void
  selectedDate: string; setSelectedDate: (d: string) => void
}) {
  const dayHabits = data.habits[selectedDate] || {}
  const dailyHabits = HABITS.filter(h => !PERIODIC_HABIT_IDS.includes(h.id) && h.id !== 'steps')
  const pct = getWeightedPct(dayHabits)
  const completedCount = dailyHabits.filter(h => dayHabits[h.id]).length
  const weekDates = getWeekDates(selectedDate)
  const dayName = getDayOfWeekName(selectedDate)
  const todayKey = today()
  const stepsRange = data.stepsRanges[selectedDate]
  const weeklyStepScore = getWeeklyStepScore(data.stepsRanges, weekDates)

  const chipDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); return getLocalDateKey(d)
  }).filter(d => d >= START_DATE && d <= todayKey)

  const toggleHabit = (habitId: string) => {
    updateData(prev => {
      const habits = { ...prev.habits }
      const dayData = { ...(habits[selectedDate] || {}) }
      dayData[habitId] = !dayData[habitId]
      habits[selectedDate] = dayData
      return { ...prev, habits }
    })
  }

  const setStepsTier = (tierId: string) => {
    updateData(prev => {
      const stepsRanges = { ...prev.stepsRanges }
      if (stepsRanges[selectedDate] === tierId) delete stepsRanges[selectedDate]
      else stepsRanges[selectedDate] = tierId
      return { ...prev, stepsRanges }
    })
  }

  const periodicHabits = HABITS.filter(h => PERIODIC_HABIT_IDS.includes(h.id))
  const allDailyInOrder = HABITS.filter(h => !PERIODIC_HABIT_IDS.includes(h.id))

  const getPeriodicStatus = (habitId: string): { done: boolean; label: string } => {
    if (habitId === 'meal_prep' || habitId === 'weekly_check') {
      const done = getWeekDates(selectedDate).some(wd => data.habits[wd]?.[habitId])
      return { done, label: done ? 'Done this week ✓' : 'Not yet this week' }
    }
    if (habitId === 'cortisone') {
      const d = new Date(selectedDate + 'T12:00:00')
      const done = Object.keys(data.habits).some(dk => {
        const dd = new Date(dk + 'T12:00:00')
        return dd.getFullYear() === d.getFullYear() && dd.getMonth() === d.getMonth() && data.habits[dk]?.[habitId]
      })
      return { done, label: done ? 'Done this month ✓' : 'Not yet this month' }
    }
    if (habitId === 'therapy') {
      const startMs = new Date(START_DATE + 'T12:00:00').getTime()
      const selMs = new Date(selectedDate + 'T12:00:00').getTime()
      const windowIndex = Math.floor(Math.floor((selMs - startMs) / 86400000) / 14)
      const wsKey = getLocalDateKey(new Date(startMs + windowIndex * 14 * 86400000))
      const weKey = getLocalDateKey(new Date(startMs + (windowIndex + 1) * 14 * 86400000))
      const done = Object.keys(data.habits).some(dk => dk >= wsKey && dk < weKey && data.habits[dk]?.[habitId])
      return { done, label: done ? 'Done this period ✓' : 'Not yet this period' }
    }
    return { done: false, label: 'Not yet' }
  }

  return (
    <div>
      {/* Date chips */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', gap: 6, padding: '12px 16px 8px', minWidth: 'max-content' }}>
          {chipDates.map(d => {
            const dd = new Date(d + 'T12:00:00')
            const dayData = data.habits[d] || {}
            const dayPct = getWeightedPct(dayData)
            const isSelected = d === selectedDate
            const isToday = d === todayKey
            const count = dailyHabits.filter(h => dayData[h.id]).length
            const isFullyDone = count === dailyHabits.length && dailyHabits.length > 0
            const isPartial = count > 0 && !isFullyDone
            return (
              <button key={d} onClick={() => setSelectedDate(d)} style={{
                width: 48, padding: '7px 0', borderRadius: 14, cursor: 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: 600, flexShrink: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                border: isSelected ? `2px solid ${COLORS.primary}` : isFullyDone && !isToday ? `2px solid ${COLORS.gold}` : '2px solid transparent',
                background: isSelected ? COLORS.primary : isFullyDone && !isToday ? `${COLORS.gold}18` : COLORS.stone,
                color: isSelected ? COLORS.white : COLORS.ink,
              }}>
                <span style={{ fontSize: 10, opacity: isSelected ? 0.85 : 0.6, fontWeight: 500 }}>{dd.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span>{dd.getDate()}</span>
                {isFullyDone && !isSelected && <span style={{ fontSize: 9, color: COLORS.gold, fontWeight: 700 }}>✓</span>}
                {isPartial && !isSelected && <span style={{ fontSize: 8, color: COLORS.slate, fontWeight: 600 }}>{dayPct}%</span>}
                {!isFullyDone && !isPartial && !isSelected && <span style={{ fontSize: 8, color: 'transparent' }}>—</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day heading */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.ink }}>{dayName}</div>
        <div style={{ fontSize: 13, color: COLORS.slate }}>{completedCount}/{dailyHabits.length} habits — {pct}%</div>
        <div style={{ height: 6, borderRadius: 3, background: COLORS.mist, marginTop: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: pct >= 70 ? COLORS.gold : COLORS.primary, transition: 'width 0.3s, background 0.3s' }} />
        </div>
      </div>

      {/* Habits in morning→night order */}
      {allDailyInOrder.map(habit => {
        // Steps: render tier selector
        if (habit.id === 'steps') {
          return (
            <div key="steps" style={{ ...cardStyle }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: stepsRange ? `${COLORS.primary}15` : COLORS.stone }}>👟</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.ink }}>10K Steps</div>
                  <div style={{ fontSize: 12, color: COLORS.slate }}>Log your step range for today</div>
                </div>
                {weeklyStepScore > 0 && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary, background: `${COLORS.primary}12`, padding: '3px 8px', borderRadius: 10 }}>
                    Week: {weeklyStepScore}%
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                {STEPS_TIERS.map(tier => {
                  const sel = stepsRange === tier.id
                  return (
                    <button key={tier.id} onClick={() => setStepsTier(tier.id)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 20, cursor: 'pointer', fontFamily: FONT,
                      border: `2px solid ${sel ? COLORS.primary : COLORS.mist}`,
                      background: sel ? `${COLORS.primary}12` : 'transparent',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}>
                      <span style={{ fontSize: 14 }}>{tier.emoji}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, color: sel ? COLORS.primary : COLORS.slate }}>{tier.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        }

        // Regular checkbox habit
        const checked = !!dayHabits[habit.id]
        const isHighPriority = HIGH_PRIORITY_HABIT_IDS.includes(habit.id)
        const hasTwoPronged = !!habit.weeklyTarget
        let weeklyCount = 0
        if (hasTwoPronged) weekDates.forEach(wd => { if (data.habits[wd]?.[habit.id]) weeklyCount++ })

        return (
          <div key={habit.id} onClick={() => toggleHabit(habit.id)} style={{
            ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
            background: checked ? `${COLORS.primary}08` : COLORS.white,
            borderColor: checked ? `${COLORS.primary}30` : COLORS.mist,
            transition: 'transform 0.15s',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: checked ? `${COLORS.primary}15` : COLORS.stone, transition: 'background 0.2s' }}>
              {habit.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.ink }}>
                {isHighPriority && <span style={{ color: COLORS.gold, marginRight: 4 }}>★</span>}
                {habit.label}
              </div>
              <div style={{ fontSize: 12, color: COLORS.slate }}>{habit.desc}</div>
              {hasTwoPronged && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: weeklyCount >= habit.weeklyTarget! ? COLORS.gold : `${COLORS.primary}15`, color: weeklyCount >= habit.weeklyTarget! ? COLORS.white : COLORS.primary }}>
                    {weeklyCount >= habit.weeklyTarget! ? '✓ ' : ''}{weeklyCount}/{habit.weeklyTarget}
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {weekDates.map((wd, i) => <div key={i} style={{ width: 6, height: 6, borderRadius: 3, background: data.habits[wd]?.[habit.id] ? (weeklyCount >= habit.weeklyTarget! ? COLORS.gold : COLORS.primary) : COLORS.mist }} />)}
                  </div>
                </div>
              )}
            </div>
            <div style={{ width: 28, height: 28, borderRadius: 8, border: `2px solid ${checked ? COLORS.primary : COLORS.mist}`, background: checked ? COLORS.primary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', animation: checked ? 'checkPop 0.3s ease' : 'none' }}>
              {checked && <span style={{ color: COLORS.white, fontSize: 14, fontWeight: 700 }}>✓</span>}
            </div>
          </div>
        )
      })}

      {/* Periodic Goals */}
      <div style={sectionTitleStyle}>PERIODIC GOALS</div>
      {periodicHabits.map(habit => {
        const checked = !!dayHabits[habit.id]
        const { done, label } = getPeriodicStatus(habit.id)
        return (
          <div key={habit.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, background: checked ? `${COLORS.primary}08` : COLORS.white, borderColor: checked ? `${COLORS.primary}30` : COLORS.mist }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: checked ? `${COLORS.primary}15` : COLORS.stone }}>
              {habit.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.ink }}>{habit.label}</div>
              <div style={{ fontSize: 12, color: COLORS.slate }}>{habit.desc}</div>
              <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: done ? '#16a34a' : COLORS.slate }}>{label}</div>
            </div>
            <div onClick={() => toggleHabit(habit.id)} style={{ width: 28, height: 28, borderRadius: 8, border: `2px solid ${checked ? COLORS.primary : COLORS.mist}`, background: checked ? COLORS.primary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', cursor: 'pointer' }}>
              {checked && <span style={{ color: COLORS.white, fontSize: 14, fontWeight: 700 }}>✓</span>}
            </div>
          </div>
        )
      })}
      <div style={{ height: 20 }} />
    </div>
  )
}

// ─── WORKOUT TAB ──────────────────────────────────────────────────────────────

function WorkoutTab({ data, updateData, expandedDay, setExpandedDay }: {
  data: AppData; updateData: (fn: (p: AppData) => AppData) => void
  expandedDay: string | null; setExpandedDay: (d: string | null) => void
}) {
  const dayName = getDayOfWeekName(today())
  const todayWorkout = WORKOUT_DAYS.find(w => w.day === dayName)
  const phase = getPhase()
  const todayLogs = data.workoutLogs[today()] || {}
  const todayDow = new Date(today() + 'T12:00:00').getDay()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyView, setHistoryView] = useState<'date' | 'exercise'>('date')
  const [selectedExercise, setSelectedExercise] = useState('')
  const [savedSets, setSavedSets] = useState<Record<string, boolean>>({})
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [confirmingUnlock, setConfirmingUnlock] = useState(false)

  const setLog = (key: string, value: string) => {
    updateData(prev => {
      const workoutLogs = { ...prev.workoutLogs }
      const dayLogs = { ...(workoutLogs[today()] || {}) }
      dayLogs[key] = value
      workoutLogs[today()] = dayLogs
      return { ...prev, workoutLogs }
    })
  }

  const setWorkoutData = (exerciseName: string, field: string, value: string) => {
    if (todayWorkout && !todayWorkout.exercises.some(ex => ex.name === exerciseName)) {
      console.warn(`[Stack Weeks] Write rejected — "${exerciseName}" not in today's ${todayWorkout.day} workout`)
      return
    }
    setLog(`${sanitizeExerciseName(exerciseName)}-${field}`, value)
  }

  const getLastSessionData = (exerciseName: string): { date: string; sets: { weight: string; reps: string }[] } | null => {
    const sessions = getAllSessionsForExercise(data, exerciseName, todayDow, today())
    return sessions[0] || null
  }

  const getOverloadTrend = (exerciseName: string): { date: string; topWeight: number }[] => {
    const sessions = getAllSessionsForExercise(data, exerciseName, todayDow, today())
    return sessions.slice(0, 4).reverse().map(s => ({
      date: s.date,
      topWeight: Math.max(...s.sets.map(set => parseFloat(set.weight) || 0))
    })).filter(s => s.topWeight > 0)
  }

  const renderNoWeightExercise = (ex: WorkoutExercise, _ei: number) => {
    const sName = sanitizeExerciseName(ex.name)
    const doneKey = `${sName}-done`
    const roundsKey = `${sName}-rounds`
    const durKey = `${sName}-duration`
    const notesKey = `${sName}-notes`

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {ex.logType === 'checkbox' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div onClick={() => setWorkoutData(ex.name, 'done', todayLogs[doneKey] === 'true' ? '' : 'true')}
              style={{ width: 32, height: 32, borderRadius: 8, border: `2px solid ${todayLogs[doneKey] === 'true' ? COLORS.primary : COLORS.mist}`, background: todayLogs[doneKey] === 'true' ? COLORS.primary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {todayLogs[doneKey] === 'true' && <span style={{ color: COLORS.white, fontWeight: 700 }}>✓</span>}
            </div>
            <span style={{ fontSize: 13, color: COLORS.slate }}>Mark complete</span>
          </div>
        )}
        {ex.logType === 'rounds' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: COLORS.slate }}>Rounds:</span>
            {['1', '2', '3'].map(r => (
              <button key={r} onClick={() => setWorkoutData(ex.name, 'rounds', todayLogs[roundsKey] === r ? '' : r)} style={{
                width: 40, height: 36, borderRadius: 10, cursor: 'pointer', fontFamily: FONT, fontWeight: 700, fontSize: 15,
                border: `2px solid ${todayLogs[roundsKey] === r ? COLORS.primary : COLORS.mist}`,
                background: todayLogs[roundsKey] === r ? COLORS.primary : 'transparent',
                color: todayLogs[roundsKey] === r ? COLORS.white : COLORS.ink,
              }}>{r}</button>
            ))}
          </div>
        )}
        {ex.logType === 'duration' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" placeholder="0" value={todayLogs[durKey] || ''} onChange={e => setWorkoutData(ex.name, 'duration', e.target.value)} onClick={e => e.stopPropagation()}
              style={{ ...inputStyle, width: 70, padding: '6px 8px', fontSize: 14, textAlign: 'center' }} />
            <span style={{ fontSize: 13, color: COLORS.slate }}>minutes</span>
          </div>
        )}
        <input type="text" placeholder="Notes (optional)" value={todayLogs[notesKey] || ''} onChange={e => setWorkoutData(ex.name, 'notes', e.target.value)} onClick={e => e.stopPropagation()}
          style={{ ...inputStyle, fontSize: 13, padding: '8px 10px' }} />
      </div>
    )
  }

  // Build all exercises list for "By Exercise" dropdown
  const allExercises: string[] = []
  WORKOUT_DAYS.forEach(wd => wd.exercises.forEach(ex => { if (!allExercises.includes(ex.name)) allExercises.push(ex.name) }))

  // Build history entries for "By Date" view
  const historyDates = Object.keys(data.workoutLogs).sort().reverse()

  return (
    <div>
      {/* Phase banner */}
      <div style={{ ...cardStyle, marginTop: 12, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.dark})`, color: COLORS.white, textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.8 }}>Phase {phase.phase} — {phase.name}</div>
        <div style={{ fontSize: 13, marginTop: 4, opacity: 0.9 }}>Weeks {phase.weeks}</div>
        {phase.phase >= 2 && (
          <div style={{ fontSize: 11, marginTop: 6, padding: '4px 10px', background: 'rgba(255,255,255,0.15)', borderRadius: 8, display: 'inline-block' }}>
            Seated DB OH Press on Friday (3×8–10) — only if shoulder pain-free 3+ weeks
          </div>
        )}
      </div>

      {/* Today's workout */}
      {todayWorkout && todayWorkout.exercises.length > 0 && (
        <div>
          <div style={sectionTitleStyle}>TODAY — {todayWorkout.day.toUpperCase()}</div>
          {todayWorkout.day === 'Wednesday' && (
            <div style={{ ...cardStyle, background: `${COLORS.gold}18`, border: `1px solid ${COLORS.gold}60`, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink, marginBottom: 4 }}>⚠️ Shoulder Recovery Day. No lateral raises. No pressing.</div>
              <div style={{ fontSize: 12, color: COLORS.slate, lineHeight: 1.5 }}>PT is the priority — everything else supports recovery and conditioning.</div>
            </div>
          )}
          <div style={{ ...cardStyle, borderColor: `${COLORS.primary}30` }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink, marginBottom: 12 }}>{todayWorkout.title}</div>
            {todayWorkout.exercises.map((ex, ei) => {
              const lastSession = ex.noWeight ? null : getLastSessionData(ex.name)
              const trend = ex.noWeight ? [] : getOverloadTrend(ex.name)
              const setCount = ex.noWeight ? 0 : (parseInt(ex.sets.charAt(0)) || 3)
              const isLocked = todayLogs['locked'] === 'true'

              return (
                <div key={ei} style={{ padding: '10px 0', borderTop: ei > 0 ? `1px solid ${COLORS.mist}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{ei + 1}. {ex.name}</div>
                      <div style={{ fontSize: 12, color: COLORS.slate }}>{ex.sets} — Rest: {ex.rest}</div>
                      {ex.note && <div style={{ fontSize: 11, color: COLORS.gold, fontStyle: 'italic', marginTop: 2 }}>{ex.note}</div>}
                      {/* Last session — all sets */}
                      {lastSession && (
                        <div style={{ fontSize: 11, color: COLORS.slate, marginTop: 3, fontStyle: 'italic' }}>
                          Last session ({fmtDate(lastSession.date)}): {lastSession.sets.map(s => `${s.weight ? s.weight + ' lbs' : '—'} × ${s.reps || '—'}`).join(', ')}
                        </div>
                      )}
                      {!lastSession && !ex.noWeight && <div style={{ fontSize: 11, color: COLORS.mist, marginTop: 3, fontStyle: 'italic' }}>No previous data yet</div>}
                      {/* Progressive overload trend */}
                      {trend.length >= 2 && (
                        <div style={{ fontSize: 11, color: COLORS.slate, marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                          {trend.map((t, ti) => {
                            const next = trend[ti + 1]
                            const arrow = next ? (next.topWeight > t.topWeight ? <span style={{ color: '#22c55e' }}>↑</span> : next.topWeight < t.topWeight ? <span style={{ color: '#ef4444' }}>↓</span> : <span style={{ color: COLORS.slate }}>→</span>) : null
                            return (
                              <span key={ti} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <span>{fmtDate(t.date)}: {t.topWeight}</span>
                                {arrow && <span style={{ marginLeft: 2 }}>{arrow}</span>}
                                {ti < trend.length - 1 && <span style={{ color: COLORS.mist, marginLeft: 2 }}>·</span>}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    {/* Form guide link */}
                    {ex.formUrl && (
                      <a href={ex.formUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        style={{ fontSize: 11, color: COLORS.primary, fontWeight: 600, textDecoration: 'none', padding: '4px 8px', borderRadius: 8, background: `${COLORS.primary}10`, whiteSpace: 'nowrap', marginLeft: 8, flexShrink: 0 }}>
                        📹 Form
                      </a>
                    )}
                  </div>

                  {ex.noWeight ? renderNoWeightExercise(ex, ei) : (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {Array.from({ length: setCount }).map((_, si) => {
                        const sName = sanitizeExerciseName(ex.name)
                        const wKey = `${sName}-${si}-w`
                        const rKey = `${sName}-${si}-r`
                        const wVal = todayLogs[wKey] || ''
                        const rVal = todayLogs[rKey] || ''
                        const setKey = `${sName}-${si}`
                        const isSaved = savedSets[setKey]
                        return (
                          <div key={si} style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', background: isSaved ? `${COLORS.primary}08` : 'transparent', borderRadius: 8, padding: isSaved ? '2px 4px' : '2px 0', transition: 'background 0.2s' }}>
                            <span style={{ fontSize: 10, color: COLORS.slate, width: 16 }}>S{si + 1}</span>
                            <input type="number" placeholder="lbs" value={wVal} readOnly={isLocked} onClick={e => e.stopPropagation()}
                              onChange={e => setWorkoutData(ex.name, `${si}-w`, e.target.value)}
                              onBlur={() => { if (wVal.trim() || rVal.trim()) setSavedSets(p => ({ ...p, [setKey]: true })) }}
                              style={{ ...inputStyle, width: 52, padding: '6px 8px', fontSize: 13, textAlign: 'center', opacity: isLocked ? 0.6 : 1 }} />
                            <input type="number" placeholder="reps" value={rVal} readOnly={isLocked} onClick={e => e.stopPropagation()}
                              onChange={e => setWorkoutData(ex.name, `${si}-r`, e.target.value)}
                              onBlur={() => { if (wVal.trim() || rVal.trim()) setSavedSets(p => ({ ...p, [setKey]: true })) }}
                              style={{ ...inputStyle, width: 48, padding: '6px 8px', fontSize: 13, textAlign: 'center', opacity: isLocked ? 0.6 : 1 }} />
                            {isSaved && (
                              <span style={{ fontSize: 11, color: COLORS.primary, fontWeight: 600, marginLeft: 2, whiteSpace: 'nowrap' }}>
                                {wVal && rVal ? `✓ ${wVal} lbs × ${rVal}` : '✓ saved'}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Locked session header / Finish button */}
          {todayLogs['locked'] === 'true' ? (
            <div style={{ ...cardStyle, background: `${COLORS.primary}08`, border: `1px solid ${COLORS.primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.primary }}>🔒 Session Locked</span>
              {!confirmingUnlock
                ? <button onClick={() => setConfirmingUnlock(true)} style={{ fontSize: 12, color: COLORS.slate, background: COLORS.stone, border: `1px solid ${COLORS.mist}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: FONT }}>Unlock to Edit</button>
                : <button onClick={() => { setLog('locked', ''); setConfirmingUnlock(false) }} style={{ fontSize: 12, color: '#dc2626', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: FONT }}>Tap again to confirm unlock</button>
              }
            </div>
          ) : (
            <button onClick={() => setShowFinishModal(true)} style={{ width: '100%', marginTop: 8, padding: '13px', borderRadius: 12, background: COLORS.primary, color: COLORS.white, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
              ✅ Finish Workout
            </button>
          )}
        </div>
      )}

      {/* Session summary modal */}
      {showFinishModal && todayWorkout && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowFinishModal(false)}>
          <div style={{ background: COLORS.white, borderRadius: '20px 20px 0 0', padding: '20px 16px 32px', width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 17, fontWeight: 800, color: COLORS.ink, marginBottom: 16 }}>📋 Session Summary — {todayWorkout.day}</div>
            {todayWorkout.exercises.map((ex, ei) => {
              const sn = sanitizeExerciseName(ex.name)
              const logs = data.workoutLogs[today()] || {}
              if (ex.noWeight) {
                const val = logs[`${sn}-rounds`] || logs[`${sn}-duration`] || (logs[`${sn}-done`] === 'true' ? '✓' : null)
                if (!val) return null
                return <div key={ei} style={{ fontSize: 13, color: COLORS.slate, padding: '6px 0', borderBottom: `1px solid ${COLORS.mist}` }}><strong style={{ color: COLORS.ink }}>{ex.name}</strong>: {val}</div>
              }
              const sets: string[] = []
              for (let si = 0; si < 10; si++) {
                const w = logs[`${sn}-${si}-w`]; const r = logs[`${sn}-${si}-r`]
                if (w || r) sets.push(`S${si+1} ${w||'—'}×${r||'—'}`); else break
              }
              if (!sets.length) return null
              return (
                <div key={ei} style={{ padding: '8px 0', borderBottom: `1px solid ${COLORS.mist}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 3 }}>{ex.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.slate }}>{sets.join('  ·  ')}</div>
                </div>
              )
            })}
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button onClick={() => setShowFinishModal(false)} style={{ flex: 1, padding: 12, borderRadius: 12, background: COLORS.stone, color: COLORS.ink, border: `1px solid ${COLORS.mist}`, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>Back to Edit</button>
              <button onClick={() => { setLog('locked', 'true'); setShowFinishModal(false) }} style={{ flex: 2, padding: 12, borderRadius: 12, background: COLORS.primary, color: COLORS.white, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: FONT }}>🔒 Lock Session</button>
            </div>
          </div>
        </div>
      )}

      {/* Full week */}
      <div style={sectionTitleStyle}>FULL WEEK</div>
      {WORKOUT_DAYS.map(wd => {
        const isExp = expandedDay === wd.day
        const isToday = wd.day === dayName
        return (
          <div key={wd.day} style={{ ...cardStyle, cursor: 'pointer', borderColor: isToday ? `${COLORS.primary}40` : COLORS.mist }}
            onClick={() => setExpandedDay(isExp ? null : wd.day)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink }}>{wd.day}</span>
                <span style={{ fontSize: 13, color: COLORS.slate, marginLeft: 8 }}>{wd.title}</span>
              </div>
              <span style={{ fontSize: 16, color: COLORS.slate, transform: isExp ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
            </div>
            {isExp && wd.exercises.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {wd.day === 'Wednesday' && (
                  <div style={{ padding: '8px 10px', background: `${COLORS.gold}18`, border: `1px solid ${COLORS.gold}60`, borderRadius: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.ink }}>⚠️ Shoulder Recovery Day. No lateral raises. No pressing.</div>
                    <div style={{ fontSize: 11, color: COLORS.slate, marginTop: 2 }}>PT is the priority — everything else supports recovery and conditioning.</div>
                  </div>
                )}
                {wd.exercises.map((ex, i) => (
                  <div key={i} style={{ padding: '6px 0', fontSize: 13, color: COLORS.ink, borderTop: i > 0 ? `1px solid ${COLORS.mist}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{i + 1}. {ex.name}</span>
                      <span style={{ color: COLORS.slate }}> — {ex.sets}</span>
                      {ex.note && <div style={{ fontSize: 11, color: COLORS.gold, fontStyle: 'italic' }}>{ex.note}</div>}
                    </div>
                    {ex.formUrl && (
                      <a href={ex.formUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        style={{ fontSize: 11, color: COLORS.primary, fontWeight: 600, textDecoration: 'none', padding: '3px 7px', borderRadius: 8, background: `${COLORS.primary}10`, whiteSpace: 'nowrap', marginLeft: 8, flexShrink: 0 }}>
                        📹
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
            {isExp && wd.exercises.length === 0 && <div style={{ marginTop: 8, fontSize: 13, color: COLORS.slate, fontStyle: 'italic' }}>Complete rest. No training.</div>}
          </div>
        )
      })}

      {/* Section 4e: Workout History */}
      <div style={{ ...cardStyle, cursor: 'pointer' }} onClick={() => setHistoryOpen(!historyOpen)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink }}>📖 Workout History</span>
          <span style={{ fontSize: 16, color: COLORS.slate, transform: historyOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
        </div>
        {historyOpen && (
          <div onClick={e => e.stopPropagation()} style={{ marginTop: 12 }}>
            {/* View toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {(['date', 'exercise'] as const).map(v => (
                <button key={v} onClick={() => setHistoryView(v)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 10, cursor: 'pointer', fontFamily: FONT, fontWeight: 600, fontSize: 13,
                  border: `2px solid ${historyView === v ? COLORS.primary : COLORS.mist}`,
                  background: historyView === v ? COLORS.primary : 'transparent',
                  color: historyView === v ? COLORS.white : COLORS.ink,
                }}>
                  {v === 'date' ? 'By Date' : 'By Exercise'}
                </button>
              ))}
            </div>

            {historyView === 'date' && (
              historyDates.length === 0
                ? <div style={{ fontSize: 13, color: COLORS.slate, fontStyle: 'italic' }}>No sessions logged yet.</div>
                : historyDates.slice(0, 20).map(dateKey => {
                  const dow = new Date(dateKey + 'T12:00:00').getDay()
                  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
                  const wd = WORKOUT_DAYS.find(w => w.day === days[dow])
                  const logs = data.workoutLogs[dateKey] || {}
                  return (
                    <div key={dateKey} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${COLORS.mist}` }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink, marginBottom: 6 }}>
                        {fmtDate(dateKey)} · {days[dow]}
                      </div>
                      {wd?.exercises.map((ex, ei) => {
                        const sn = sanitizeExerciseName(ex.name)
                        if (ex.noWeight) {
                          const done = logs[`${sn}-done`] || logs[`${sn}-rounds`] || logs[`${sn}-duration`]
                          if (!done) return null
                          return (
                            <div key={ei} style={{ fontSize: 12, color: COLORS.slate, marginBottom: 3 }}>
                              {ex.name}: {logs[`${sn}-rounds`] ? `${logs[`${sn}-rounds`]} rounds` : logs[`${sn}-duration`] ? `${logs[`${sn}-duration`]} min` : '✓'}
                            </div>
                          )
                        }
                        const sets: string[] = []
                        for (let si = 0; si < 10; si++) {
                          const w = logs[`${sn}-${si}-w`]; const r = logs[`${sn}-${si}-r`]
                          if (w || r) sets.push(`S${si+1} ${w||'—'}×${r||'—'}`); else break
                        }
                        if (!sets.length) return null
                        return (
                          <div key={ei} style={{ fontSize: 12, color: COLORS.slate, marginBottom: 3 }}>
                            <span style={{ fontWeight: 600, color: COLORS.ink }}>{ex.name}:</span> {sets.join(', ')}
                          </div>
                        )
                      })}
                    </div>
                  )
                })
            )}

            {historyView === 'exercise' && (
              <div>
                <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)}
                  style={{ ...inputStyle, marginBottom: 12, fontSize: 14 }}>
                  <option value="">Select exercise…</option>
                  {allExercises.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
                {selectedExercise && (() => {
                  const entries: { dateKey: string; sets: string[] }[] = []
                  const sn = sanitizeExerciseName(selectedExercise)
                  historyDates.forEach(dateKey => {
                    const logs = data.workoutLogs[dateKey] || {}
                    const sets: string[] = []
                    for (let si = 0; si < 10; si++) {
                      const w = logs[`${sn}-${si}-w`]; const r = logs[`${sn}-${si}-r`]
                      if (w || r) sets.push(`S${si+1} ${w||'—'}×${r||'—'}`); else break
                    }
                    if (sets.length) entries.push({ dateKey, sets })
                  })
                  return entries.length === 0
                    ? <div style={{ fontSize: 13, color: COLORS.slate, fontStyle: 'italic' }}>No sessions found for this exercise.</div>
                    : entries.map(({ dateKey, sets }) => (
                      <div key={dateKey} style={{ marginBottom: 8, padding: '8px 0', borderBottom: `1px solid ${COLORS.mist}` }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.ink, marginBottom: 3 }}>{fmtDate(dateKey)}</div>
                        <div style={{ fontSize: 12, color: COLORS.slate }}>{sets.join(', ')}</div>
                      </div>
                    ))
                })()}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ height: 20 }} />
    </div>
  )
}

// ─── NUTRITION TAB (Section 5) ────────────────────────────────────────────────

function NutritionTab({ data, updateData, expandedMeal, setExpandedMeal }: {
  data: AppData; updateData: (fn: (p: AppData) => AppData) => void
  expandedMeal: number | null; setExpandedMeal: (n: number | null) => void
}) {
  const dayName = getDayOfWeekName(today())
  const isRest = dayName === 'Saturday' || dayName === 'Sunday'
  // Section 5b: updated daily totals
  const cals = isRest ? 2240 : 2440
  const carbs = isRest ? 172 : 212
  const todayLog = data.nutritionLogs[today()] || { calories: '', protein: '', carbs: '', fat: '' }

  const updateNutrition = (field: string, value: string) => {
    updateData(prev => {
      const nutritionLogs = { ...prev.nutritionLogs }
      const current = nutritionLogs[today()] || { calories: '', protein: '', carbs: '', fat: '' }
      nutritionLogs[today()] = { ...current, [field]: value }
      return { ...prev, nutritionLogs }
    })
  }

  const macroBar = (label: string, current: number, target: number, color: string) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: COLORS.ink, marginBottom: 4 }}>
        <span>{label}</span>
        <span>{current || 0} / {target}{label === 'Calories' ? '' : 'g'}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: COLORS.mist, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min((current / target) * 100, 100)}%`, borderRadius: 4, background: color, transition: 'width 0.3s' }} />
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ ...cardStyle, marginTop: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink, marginBottom: 12 }}>{isRest ? 'Rest' : 'Training'} Day Targets</div>
        {macroBar('Calories', parseInt(todayLog.calories) || 0, cals, COLORS.primary)}
        {macroBar('Protein', parseInt(todayLog.protein) || 0, 205, '#22c55e')}
        {macroBar('Carbs', parseInt(todayLog.carbs) || 0, carbs, '#f59e0b')}
        {macroBar('Fat', parseInt(todayLog.fat) || 0, 67, '#ef4444')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
          {[{ label: 'Calories', field: 'calories' }, { label: 'Protein (g)', field: 'protein' }, { label: 'Carbs (g)', field: 'carbs' }, { label: 'Fat (g)', field: 'fat' }].map(f => (
            <div key={f.field}>
              <label style={{ fontSize: 11, color: COLORS.slate, fontWeight: 600 }}>{f.label}</label>
              <input type="number" value={(todayLog as Record<string, string>)[f.field] || ''} onChange={e => updateNutrition(f.field, e.target.value)} style={{ ...inputStyle, marginTop: 4, fontSize: 14 }} placeholder="0" />
            </div>
          ))}
        </div>
      </div>

      {/* Section 5c: 9PM fasting window */}
      <div style={{ ...cardStyle, background: `linear-gradient(135deg, ${COLORS.dark}, ${COLORS.primary})`, color: COLORS.white }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>🕗 Fasting Window</div>
        <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>
          Stop eating at <strong>9:00 PM</strong> — every day, no exceptions.
        </div>
        <div style={{ fontSize: 12, marginTop: 8, opacity: 0.75 }}>
          Early AM training → 7–8AM / 12:30–1:30PM / 7–9PM (~11hr fast)<br />
          Mid-morning → 9:30–10:30AM / 3PM / 7:30–9PM (~10hr fast)<br />
          Afternoon → 11AM / 3PM / 7–9PM (~9hr fast)
        </div>
      </div>

      <div style={{ ...cardStyle, background: `linear-gradient(135deg, ${COLORS.gold}20, ${COLORS.gold}08)`, border: `1px solid ${COLORS.gold}40` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold }}>🏆 Weekly Cheat Meal</div>
        <div style={{ fontSize: 13, color: COLORS.ink, marginTop: 4 }}>1 planned cheat MEAL per week (not a cheat day). Enjoy it guilt-free — it's built into the plan.</div>
      </div>

      <div style={sectionTitleStyle}>MEAL PLAN</div>
      {MEALS.map((meal, i) => (
        <div key={i} style={{ ...cardStyle, cursor: 'pointer' }} onClick={() => setExpandedMeal(expandedMeal === i ? null : i)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{meal.name}</div>
            <span style={{ fontSize: 16, color: COLORS.slate, transform: expandedMeal === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
          </div>
          <div style={{ fontSize: 12, color: COLORS.primary, fontWeight: 600, marginTop: 4 }}>{meal.macros}</div>
          {expandedMeal === i && (
            <div style={{ fontSize: 13, color: COLORS.slate, marginTop: 8, padding: '8px 0', borderTop: `1px solid ${COLORS.mist}`, lineHeight: 1.6 }}>
              {meal.items}
              {meal.note && <div style={{ marginTop: 6, fontSize: 12, color: COLORS.gold, fontStyle: 'italic' }}>📝 {meal.note}</div>}
            </div>
          )}
        </div>
      ))}

      <div style={sectionTitleStyle}>FOODS TO LIMIT</div>
      <div style={{ ...cardStyle, fontSize: 13, color: COLORS.ink, lineHeight: 1.6 }}>
        Candy, chips outside planned snack, late-night eating past 9PM, excess dark chocolate.
      </div>
      <div style={{ height: 20 }} />
    </div>
  )
}

// ─── COMPLETION GRAPH ─────────────────────────────────────────────────────────

function CompletionGraph({ data }: { data: AppData }) {
  const todayKey = today()
  const BAR_WIDTH = 16, BAR_GAP = 4, CHART_HEIGHT = 120, LABEL_HEIGHT = 28, Y_LABEL_WIDTH = 32
  const totalWidth = TOTAL_DAYS * (BAR_WIDTH + BAR_GAP) + Y_LABEL_WIDTH

  const entries: { dayNum: number; pct: number; dateKey: string }[] = []
  for (let i = 1; i <= TOTAL_DAYS; i++) {
    const d = new Date(START_DATE + 'T12:00:00'); d.setDate(d.getDate() + i - 1)
    const dateKey = getLocalDateKey(d)
    if (dateKey > todayKey) break
    const habitsForDay = data.habits[dateKey] || {}
    if (Object.keys(habitsForDay).length === 0) continue
    entries.push({ dayNum: i, pct: getWeightedPct(habitsForDay), dateKey })
  }

  return (
    <div style={{ ...cardStyle, padding: '14px 0 0' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink, marginBottom: 10, paddingLeft: 14 }}>Daily Completion</div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <svg width={totalWidth} height={CHART_HEIGHT + LABEL_HEIGHT} style={{ display: 'block', minWidth: totalWidth }}>
          {[0, 50, 100].map(yVal => {
            const y = CHART_HEIGHT - (yVal / 100) * CHART_HEIGHT
            return (
              <g key={yVal}>
                <text x={Y_LABEL_WIDTH - 4} y={y + 4} textAnchor="end" fontSize={9} fill={COLORS.slate} fontFamily={FONT}>{yVal}%</text>
                <line x1={Y_LABEL_WIDTH} y1={y} x2={totalWidth} y2={y} stroke={COLORS.mist} strokeWidth={0.5} />
              </g>
            )
          })}
          {/* 70% threshold */}
          <line x1={Y_LABEL_WIDTH} y1={CHART_HEIGHT - 0.7 * CHART_HEIGHT} x2={totalWidth} y2={CHART_HEIGHT - 0.7 * CHART_HEIGHT} stroke={COLORS.gold} strokeWidth={1} strokeDasharray="4 3" />
          <text x={totalWidth - 4} y={CHART_HEIGHT - 0.7 * CHART_HEIGHT - 3} textAnchor="end" fontSize={8} fill={COLORS.gold} fontFamily={FONT}>70%</text>
          {entries.map(({ dayNum, pct, dateKey }) => {
            const x = Y_LABEL_WIDTH + (dayNum - 1) * (BAR_WIDTH + BAR_GAP)
            const barH = Math.max(2, (pct / 100) * CHART_HEIGHT)
            const isToday = dateKey === todayKey
            const weekLabel = dayNum % 7 === 1 ? `W${Math.ceil(dayNum / 7)}` : null
            return (
              <g key={dayNum}>
                <rect x={x} y={CHART_HEIGHT - barH} width={BAR_WIDTH} height={barH} fill={isToday ? COLORS.gold : COLORS.primary} rx={2} opacity={0.85} />
                {isToday && <circle cx={x + BAR_WIDTH / 2} cy={CHART_HEIGHT - barH - 4} r={3} fill={COLORS.gold} />}
                {weekLabel && <text x={x + BAR_WIDTH / 2} y={CHART_HEIGHT + 16} textAnchor="middle" fontSize={8} fill={COLORS.slate} fontFamily={FONT}>{weekLabel}</text>}
              </g>
            )
          })}
        </svg>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px 10px', fontSize: 10, color: COLORS.slate }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: COLORS.primary, borderRadius: 2, display: 'inline-block' }} />Logged day</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: COLORS.gold, borderRadius: 2, display: 'inline-block' }} />Today</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 14, height: 0, borderTop: `2px dashed ${COLORS.gold}`, display: 'inline-block' }} />70% threshold</span>
      </div>
    </div>
  )
}

// ─── INDIVIDUAL STREAKS (Section 6b) ─────────────────────────────────────────

function IndividualStreaks({ data }: { data: AppData }) {
  const alcoholStreak = getIndividualStreak(data, 'no_alcohol')
  const pornStreak = getIndividualStreak(data, 'no_porn')
  const sexStreak = getIndividualStreak(data, 'no_sex')
  const workoutStreak = getIndividualStreak(data, 'workout')
  const workoutWeeks = getWorkoutWeeks(data)
  const qualifyingWeeks = workoutWeeks.filter(Boolean).length

  const cards = [
    { emoji: '🍷', name: 'No Alcohol',  ...alcoholStreak },
    { emoji: '🚫', name: 'No Porn',     ...pornStreak },
    { emoji: '⛔', name: 'No Sex',      ...sexStreak },
    { emoji: '⚡', name: 'Workout',     ...workoutStreak },
  ]

  return (
    <div>
      <div style={sectionTitleStyle}>INDIVIDUAL STREAKS</div>
      {cards.map(card => (
        <div key={card.name} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 26 }}>{card.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{card.name}</div>
            <div style={{ fontSize: 11, color: COLORS.slate }}>Personal best: {card.best} days</div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: COLORS.gold, minWidth: 48, textAlign: 'right' }}>{card.current}</div>
        </div>
      ))}

      {/* Workout Weeks */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 26 }}>💪</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>Workout Weeks</div>
            <div style={{ fontSize: 11, color: COLORS.slate }}>5+ workouts / week</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.gold }}>{qualifyingWeeks} of 13</div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {workoutWeeks.map((qualified, wi) => (
            <div key={wi} style={{
              width: 30, height: 30, borderRadius: 15,
              background: qualified ? COLORS.gold : COLORS.mist,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
              color: qualified ? COLORS.white : COLORS.slate,
            }}>
              {wi + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── WEEKLY AUDIO DIARY (Section 6c) ─────────────────────────────────────────

function WeeklyAudioDiary({ data, updateData }: { data: AppData; updateData: (fn: (p: AppData) => AppData) => void }) {
  const weekNum = getWeekNumber()
  const dayOfWeek = new Date().getDay()
  const showPrompt = (dayOfWeek === 0 || dayOfWeek === 1) && !data.audioLogs[`week_${weekNum}`]

  const [recording, setRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioURL, setAudioURL] = useState('')
  const [transcript, setTranscript] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const [hasSpeechAPI, setHasSpeechAPI] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SRA = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setHasSpeechAPI(!!SRA)
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioURL(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      setRecording(true)
      setRecordTime(0)
      timerRef.current = setInterval(() => setRecordTime(p => p + 1), 1000)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SRA = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SRA) {
        const rec = new SRA()
        rec.continuous = true
        rec.interimResults = false
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (e: any) => setTranscript(Array.from(e.results).map((r: any) => r[0].transcript).join(' '))
        rec.start()
        recognitionRef.current = rec
      }
    } catch {
      alert('Microphone access required. Please allow mic access and try again.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
    try { recognitionRef.current?.stop() } catch {}
    setRecording(false)
  }

  const saveRecording = () => {
    if (!audioBlob) return
    const reader = new FileReader()
    reader.onload = e => {
      const log: AudioLog = {
        weekNum, date: today(), duration: recordTime,
        audio: e.target?.result as string,
        transcript: transcript || undefined,
        notes: (!hasSpeechAPI && manualNotes) ? manualNotes : undefined,
      }
      updateData(prev => ({ ...prev, audioLogs: { ...prev.audioLogs, [`week_${weekNum}`]: log } }))
      setAudioBlob(null); setAudioURL(''); setTranscript(''); setManualNotes(''); setRecordTime(0)
    }
    reader.readAsDataURL(audioBlob)
  }

  const existingLogs = Object.values(data.audioLogs).sort((a, b) => b.weekNum - a.weekNum)

  return (
    <div>
      <div style={sectionTitleStyle}>WEEKLY REFLECTIONS</div>
      {showPrompt && (
        <div style={{ ...cardStyle, border: `1px solid ${COLORS.gold}40`, background: `${COLORS.gold}08` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold, marginBottom: 10 }}>🎙️ Record This Week's Reflection — Week {weekNum}</div>
          {!recording && !audioBlob && (
            <button onClick={startRecording} style={{ width: '100%', padding: 14, borderRadius: 12, background: COLORS.primary, color: COLORS.white, border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
              🎙️ Start Recording
            </button>
          )}
          {recording && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: recordTime >= 60 ? COLORS.gold : COLORS.ink }}>
                  {Math.floor(recordTime / 60)}:{String(recordTime % 60).padStart(2, '0')}
                </div>
                {recordTime < 60 && <div style={{ fontSize: 12, color: COLORS.slate }}>Stop available in {60 - recordTime}s</div>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: '#ef4444' }} />
                  <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Recording</span>
                </div>
              </div>
              {transcript && <div style={{ fontSize: 12, color: COLORS.slate, fontStyle: 'italic', marginBottom: 8, padding: 8, background: COLORS.stone, borderRadius: 8, lineHeight: 1.5 }}>"{transcript}"</div>}
              <button onClick={stopRecording} disabled={recordTime < 60} style={{ width: '100%', padding: 14, borderRadius: 12, background: recordTime >= 60 ? '#ef4444' : COLORS.mist, color: recordTime >= 60 ? COLORS.white : COLORS.slate, border: 'none', fontSize: 15, fontWeight: 700, cursor: recordTime >= 60 ? 'pointer' : 'not-allowed', fontFamily: FONT }}>
                ⏹ Stop Recording
              </button>
            </div>
          )}
          {audioBlob && !recording && (
            <div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: COLORS.slate, marginBottom: 6 }}>Preview:</div>
                <audio controls src={audioURL} style={{ width: '100%' }} />
              </div>
              {!hasSpeechAPI && (
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, color: COLORS.slate, fontWeight: 600 }}>Notes</label>
                  <textarea value={manualNotes} onChange={e => setManualNotes(e.target.value)} style={{ ...inputStyle, marginTop: 4, minHeight: 60, resize: 'vertical' as const }} placeholder="Add notes about this week..." />
                </div>
              )}
              {transcript && <div style={{ fontSize: 12, color: COLORS.slate, fontStyle: 'italic', marginBottom: 10, padding: 8, background: COLORS.stone, borderRadius: 8, lineHeight: 1.5 }}><strong>Transcript:</strong> {transcript}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setAudioBlob(null); setAudioURL(''); setTranscript('') }} style={{ flex: 1, padding: 12, borderRadius: 12, background: COLORS.stone, color: COLORS.ink, border: `1px solid ${COLORS.mist}`, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}>Discard</button>
                <button onClick={saveRecording} style={{ flex: 2, padding: 12, borderRadius: 12, background: COLORS.primary, color: COLORS.white, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>Save Reflection</button>
              </div>
            </div>
          )}
        </div>
      )}
      {existingLogs.map(log => (
        <div key={log.weekNum} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink }}>Week {log.weekNum} Reflection</div>
            <div style={{ fontSize: 11, color: COLORS.slate }}>{log.date} · {Math.floor(log.duration / 60)}m {log.duration % 60}s</div>
          </div>
          <audio controls src={log.audio} style={{ width: '100%', marginBottom: 6 }} />
          {log.transcript && <div style={{ fontSize: 12, color: COLORS.slate, fontStyle: 'italic', lineHeight: 1.5 }}>{log.transcript}</div>}
          {log.notes && <div style={{ fontSize: 12, color: COLORS.slate, lineHeight: 1.5, marginTop: 4 }}>{log.notes}</div>}
        </div>
      ))}
    </div>
  )
}

// ─── PROGRESS TAB ─────────────────────────────────────────────────────────────

function ProgressTab({ data, updateData }: { data: AppData; updateData: (fn: (p: AppData) => AppData) => void }) {
  const streak = getStreak(data)
  const dayNum = getDayNumber()
  const weekNum = getWeekNumber()
  const [showForm, setShowForm] = useState(false)
  const [formWeight, setFormWeight] = useState('')
  const [formBF, setFormBF] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const saveWeeklyLog = () => {
    const newLog: WeeklyLog = { week: weekNum, date: today(), weight: formWeight, bodyFat: formBF, notes: formNotes }
    updateData(prev => {
      const logs = [...prev.weeklyLogs]
      const idx = logs.findIndex(l => l.week === weekNum)
      if (idx >= 0) logs[idx] = newLog; else logs.push(newLog)
      return { ...prev, weeklyLogs: logs }
    })
    setShowForm(false); setFormWeight(''); setFormBF(''); setFormNotes('')
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `stackweeks_backup_${today()}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try { saveData(JSON.parse(ev.target?.result as string)); window.location.reload() }
      catch { alert('Invalid backup file') }
    }
    reader.readAsText(file)
  }

  const milestones = [
    { week: 4, target: '226–228 lbs, ~16.5% BF', note: 'Clothes fitting differently' },
    { week: 8, target: '220–223 lbs, ~15% BF', note: 'Shoulder width emerging' },
    { week: 12, target: '213–218 lbs, ~12–14% BF', note: 'V-taper visible, abs showing' },
  ]

  return (
    <div>
      {/* Streak hero */}
      <div style={{ ...cardStyle, marginTop: 12, textAlign: 'center', background: streak > 0 ? `linear-gradient(135deg, ${COLORS.gold}15, ${COLORS.gold}05)` : COLORS.white, border: streak > 0 ? `1px solid ${COLORS.gold}40` : `1px solid ${COLORS.mist}` }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: streak > 0 ? COLORS.gold : COLORS.slate }}>
          {streak > 0
            ? <span style={{ backgroundImage: `linear-gradient(90deg, ${COLORS.gold}, #E8D48B, ${COLORS.gold})`, backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'goldShimmer 3s linear infinite' }}>🔥 {streak}</span>
            : '0'}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: streak > 0 ? COLORS.gold : COLORS.slate }}>Day Streak</div>
        <div style={{ fontSize: 12, color: COLORS.slate, marginTop: 4 }}>≥70% weighted habits completed = streak day</div>
      </div>

      {/* Completion graph */}
      <CompletionGraph data={data} />

      {/* Individual streaks */}
      <IndividualStreaks data={data} />

      {/* Weekly audio diary */}
      <WeeklyAudioDiary data={data} updateData={updateData} />

      {/* Challenge progress */}
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink, marginBottom: 8 }}>Challenge Progress</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: COLORS.slate, marginBottom: 6 }}>
          <span>Day {dayNum} of {TOTAL_DAYS}</span>
          <span>{Math.round((dayNum / TOTAL_DAYS) * 100)}%</span>
        </div>
        <div style={{ height: 10, borderRadius: 5, background: COLORS.mist, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(dayNum / TOTAL_DAYS) * 100}%`, borderRadius: 5, background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.dark})`, transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COLORS.slate, marginTop: 6 }}>
          <span>Mar 23</span><span>Jun 21</span>
        </div>
      </div>

      {/* Starting metrics */}
      <div style={sectionTitleStyle}>STARTING METRICS (MAR 19)</div>
      <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[{ label: 'Weight', value: '231.2 lbs' }, { label: 'Body Fat', value: '17.8%' }, { label: 'Lean Mass', value: '190.2 lbs' }, { label: 'Skeletal Muscle', value: '122.8 lbs' }].map(m => (
          <div key={m.label} style={{ padding: 8, background: COLORS.stone, borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: COLORS.slate, fontWeight: 600 }}>{m.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink, marginTop: 2 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Milestones */}
      <div style={sectionTitleStyle}>MILESTONES</div>
      {milestones.map(m => (
        <div key={m.week} style={{ ...cardStyle, borderLeft: `3px solid ${weekNum >= m.week ? COLORS.gold : COLORS.mist}`, opacity: weekNum >= m.week ? 1 : 0.7 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: weekNum >= m.week ? COLORS.gold : COLORS.ink }}>Week {m.week} {weekNum >= m.week ? '✓' : ''}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{m.target}</div>
          <div style={{ fontSize: 12, color: COLORS.slate, fontStyle: 'italic' }}>"{m.note}"</div>
        </div>
      ))}

      {/* Weekly check-ins */}
      <div style={sectionTitleStyle}>WEEKLY CHECK-INS</div>
      <button onClick={() => setShowForm(!showForm)} style={{ width: '100%', padding: '12px', borderRadius: 12, border: `2px dashed ${COLORS.primary}40`, background: `${COLORS.primary}08`, color: COLORS.primary, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 12, fontFamily: FONT }}>
        + Log Week {weekNum} Check-In
      </button>
      {showForm && (
        <div style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div><label style={{ fontSize: 11, color: COLORS.slate, fontWeight: 600 }}>Weight (lbs)</label><input value={formWeight} onChange={e => setFormWeight(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} placeholder="0" type="number" /></div>
            <div><label style={{ fontSize: 11, color: COLORS.slate, fontWeight: 600 }}>Body Fat %</label><input value={formBF} onChange={e => setFormBF(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} placeholder="0" type="number" step="0.1" /></div>
          </div>
          <label style={{ fontSize: 11, color: COLORS.slate, fontWeight: 600 }}>Notes</label>
          <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} style={{ ...inputStyle, marginTop: 4, minHeight: 60, resize: 'vertical' as const }} placeholder="How was the week?" />
          <button onClick={saveWeeklyLog} style={{ width: '100%', marginTop: 10, padding: 12, borderRadius: 12, background: COLORS.primary, color: COLORS.white, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: FONT }}>Save Check-In</button>
        </div>
      )}
      {data.weeklyLogs.slice().reverse().map(log => (
        <div key={log.week} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink }}>Week {log.week}</span>
            <span style={{ fontSize: 12, color: COLORS.slate }}>{log.date}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <div><span style={{ fontSize: 12, color: COLORS.slate }}>Weight: </span><span style={{ fontSize: 14, fontWeight: 600 }}>{log.weight} lbs</span></div>
            <div><span style={{ fontSize: 12, color: COLORS.slate }}>BF: </span><span style={{ fontSize: 14, fontWeight: 600 }}>{log.bodyFat}%</span></div>
          </div>
          {log.notes && <div style={{ fontSize: 13, color: COLORS.slate, marginTop: 6 }}>{log.notes}</div>}
        </div>
      ))}

      {/* Data */}
      <div style={sectionTitleStyle}>DATA</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={exportData} style={{ flex: 1, padding: 12, borderRadius: 12, background: COLORS.primary, color: COLORS.white, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>📥 Export Backup</button>
        <button onClick={() => fileRef.current?.click()} style={{ flex: 1, padding: 12, borderRadius: 12, background: COLORS.stone, color: COLORS.ink, border: `1px solid ${COLORS.mist}`, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>📤 Restore</button>
        <input ref={fileRef} type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
      </div>
      <div style={{ height: 20 }} />
    </div>
  )
}

// ─── PLAN TAB ─────────────────────────────────────────────────────────────────

function PlanTab() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const toggle = (key: string) => setExpanded(expanded === key ? null : key)

  const nonNegotiables = [
    '200g protein/day — everything else is secondary',
    'Wednesday PT is the most important session — never skip or cut short',
    'Wednesday is Shoulder Recovery Day — zero pressing, zero lateral raises',
    'Log every set with weight and reps',
    '7 hours sleep is the floor, not the goal',
  ]

  const sections: { key: string; title: string; content: string }[] = [
    { key: 'goal', title: 'Program Goal', content: '91-day body recomposition: reduce body fat from ~18% to 12–14% while maintaining or increasing lean mass. Target weight: 213–218 lbs by June 21, 2026.' },
    { key: 'injury', title: 'Injury Protocol', content: 'Right shoulder labral tear, 90–95% recovered.\n\n• No barbell overhead press\n• No upright rows\n• No behind-the-neck movements\n• All lateral raises at slight forward angle\n• PT every Wednesday — non-negotiable\n• If PT skipped 3+ days → drop 1 set from all pressing that week\n\nSHOULDER RESTRUCTURE — Week 2: Sharp pain reported in right shoulder (previously torn labrum). Wednesday direct shoulder work removed entirely. Lateral raises reduced from 7 sets to 3 sets/week, moved to Friday. Cable Face Pulls removed from Thursday — covered during Wednesday PT/rehab session; redundant direct volume on an actively rehabbed shoulder is unnecessary. Phase II overhead pressing pushed from Week 5 to Week 9 minimum, conditional on 3+ consecutive pain-free weeks. If sharp pain recurs, stop aggravating movement immediately and reduce lateral raise weight by 50% the following week.' },
    { key: 'overload', title: 'Progressive Overload', content: '• Dumbbells: +2.5–5 lbs\n• Cables: +5 lbs\n• Barbell: +5 lbs\n• Lateral raises: +2.5 lbs only\n• Overhead press: +2.5–5 lbs in Phase II–III\n• Log every set — no guessing' },
    { key: 'deload', title: 'Deload Schedule', content: '40–50% volume reduction at the end of Week 8, before Phase III begins. Maintain intensity, reduce sets.' },
    { key: 'recovery', title: 'Recovery Stack', content: '• Magnesium glycinate 200–400mg, 30–60 min before bed\n• Electrolytes on leg days and Wednesdays\n• Coconut water daily' },
    { key: 'foods', title: 'Foods to Limit', content: '• Candy\n• Chips outside planned snack\n• Late-night eating past 9PM\n• Excess dark chocolate' },
    { key: 'tracking', title: 'Tracking Protocol', content: '• Use weekly average weight, not daily\n• Photos every 2 weeks, same lighting\n• Body fat measured consistently (same method, same time)' },
  ]

  return (
    <div>
      <div style={{ ...cardStyle, marginTop: 12, background: `linear-gradient(135deg, ${COLORS.primary}08, ${COLORS.primary}03)`, border: `1px solid ${COLORS.primary}25` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 10 }}>⚡ Non-Negotiables</div>
        {nonNegotiables.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 0', borderTop: i > 0 ? `1px solid ${COLORS.primary}10` : 'none' }}>
            <span style={{ minWidth: 20, height: 20, borderRadius: 6, background: COLORS.primary, color: COLORS.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, marginTop: 1 }}>{i + 1}</span>
            <span style={{ fontSize: 14, color: COLORS.ink, lineHeight: 1.4 }}>{item}</span>
          </div>
        ))}
      </div>

      <div style={sectionTitleStyle}>PHASES</div>
      <div style={cardStyle}>
        {[
          { p: 'I', w: 'Weeks 1–8', name: 'Foundation', note: 'No overhead pressing. Program exactly as written.' },
          { p: 'II', w: 'Week 9+ (conditional)', name: 'Build', note: 'Introduce Seated DB OH Press on Friday after lateral raises. 3×8–10. ONLY IF shoulder completely pain-free 3+ consecutive weeks. Stop immediately if any sharp pain.' },
          { p: 'III', w: 'After Phase II', name: 'Peak', note: 'Only if Phase II consistently pain-free. Elevate to 4×6–10.' },
        ].map((ph, i) => (
          <div key={i} style={{ padding: '10px 0', borderTop: i > 0 ? `1px solid ${COLORS.mist}` : 'none' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ padding: '2px 8px', borderRadius: 6, background: COLORS.primary, color: COLORS.white, fontSize: 12, fontWeight: 700 }}>Phase {ph.p}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>{ph.name}</span>
              <span style={{ fontSize: 12, color: COLORS.slate }}>({ph.w})</span>
            </div>
            <div style={{ fontSize: 13, color: COLORS.slate, marginTop: 4, paddingLeft: 4 }}>{ph.note}</div>
          </div>
        ))}
      </div>

      <div style={sectionTitleStyle}>REFERENCE</div>
      {sections.map(s => (
        <div key={s.key} style={{ ...cardStyle, cursor: 'pointer' }} onClick={() => toggle(s.key)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{s.title}</span>
            <span style={{ fontSize: 16, color: COLORS.slate, transform: expanded === s.key ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
          </div>
          {expanded === s.key && <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.mist}`, fontSize: 13, color: COLORS.ink, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{s.content}</div>}
        </div>
      ))}
      <div style={{ height: 20 }} />
    </div>
  )
}
