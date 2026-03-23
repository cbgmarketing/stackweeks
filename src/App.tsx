import { useState, useCallback, useRef } from 'react'

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

interface AppData {
  habits: Record<string, Record<string, boolean>>
  workoutLogs: Record<string, Record<string, string>>
  weeklyLogs: WeeklyLog[]
  nutritionLogs: Record<string, { calories: string; protein: string; carbs: string; fat: string }>
}

// ─── Habits ──────────────────────────────────────────────────────────────────

const HABITS: HabitDef[] = [
  { id: 'workout', label: 'Workout', desc: "Log today's session", emoji: '⚡', category: 'FITNESS', weeklyTarget: 5 },
  { id: 'steps', label: '10K Steps', desc: 'Daily movement goal', emoji: '👟', category: 'FITNESS', weeklyTarget: 4 },
  { id: 'macros', label: 'Hit Macros', desc: '200g protein + calorie target', emoji: '🥗', category: 'NUTRITION' },
  { id: 'water', label: '1 Gallon Water', desc: '~3.8L throughout the day', emoji: '💧', category: 'NUTRITION' },
  { id: 'no_eat_after_8', label: 'No Eating After 8PM', desc: 'Fasting window maintained', emoji: '🕗', category: 'NUTRITION' },
  { id: 'meal_prep', label: 'Meal Prep', desc: 'Weekly — log when complete', emoji: '🍱', category: 'NUTRITION' },
  { id: 'no_snacking', label: 'No Reckless Snacking', desc: 'Intentional eating only', emoji: '🍪', category: 'NUTRITION' },
  { id: 'prayer', label: 'Morning Prayer', desc: 'First thing in the morning', emoji: '🙏🏾', category: 'MINDSET' },
  { id: 'no_hiphop', label: 'No Hip-Hop Before 1PM', desc: 'Intentional morning audio', emoji: '🎵', category: 'MINDSET' },
  { id: 'no_porn', label: 'No Porn', desc: 'Log before bed', emoji: '🚫', category: 'DISCIPLINE' },
  { id: 'no_sex', label: 'No Sex', desc: 'Log before bed', emoji: '⛔', category: 'DISCIPLINE' },
  { id: 'no_alcohol', label: 'No Alcohol', desc: 'Log before bed', emoji: '🍷', category: 'DISCIPLINE' },
  { id: 'bed_1030', label: 'In Bed by 10:30PM', desc: 'Screens off, lights down', emoji: '🌙', category: 'RECOVERY' },
  { id: 'sleep_7h', label: '7 Hours Sleep', desc: 'Log upon waking', emoji: '😴', category: 'RECOVERY' },
  { id: 'vitamins', label: 'Vitamins + Supplements', desc: 'With first or second meal', emoji: '💊', category: 'RECOVERY' },
  { id: 'skin', label: 'Skin Routine', desc: 'AM + PM routine complete', emoji: '✨', category: 'RECOVERY' },
  { id: 'invisalign', label: 'Invisalign', desc: 'Worn today — log before bed', emoji: '🦷', category: 'RECOVERY' },
  { id: 'weekly_check', label: 'Weekly Progress Check', desc: 'Photo, weight, body fat', emoji: '📸', category: 'TRACKING' },
]

// ─── Workout Program ─────────────────────────────────────────────────────────

const WORKOUT_DAYS: WorkoutDay[] = [
  {
    day: 'Monday', title: 'Push (Chest & Triceps)', exercises: [
      { name: 'Incline DB Bench Press', sets: '4×6–10', rest: '2.5–4 min', note: 'Primary compound. Elbows 60–75° from torso.' },
      { name: 'Pec Deck Machine Flys', sets: '3×10–12', rest: '60–90 sec', note: 'Full ROM, constant tension.' },
      { name: 'Single-Arm DB Floor Press', sets: '3×10–12 each', rest: '60–90 sec', note: 'Limited ROM protects the labrum.' },
      { name: 'Cable Triceps Rope Pushdown', sets: '3×10–12', rest: '60–90 sec', note: 'Elbows fixed at sides.' },
      { name: 'Cable OH Triceps Extension', sets: '3×12–15', rest: '60 sec', note: 'Stop if shoulder discomfort.' },
    ]
  },
  {
    day: 'Tuesday', title: 'Legs (Quad Dominant)', exercises: [
      { name: 'Hack Squat Machine', sets: '4×8–10', rest: '2.5–4 min' },
      { name: 'Leg Press', sets: '3×10–12', rest: '2–3 min' },
      { name: 'DB Lunge In Place', sets: '3×10–12 each', rest: '2 min' },
      { name: 'Leg Extension', sets: '3×10–12', rest: '60–90 sec', note: '1-sec hold at top.' },
      { name: 'Seated Calf Raises', sets: '3×12–15', rest: '60 sec' },
      { name: 'Stairmaster Finisher', sets: '8–10 min', rest: 'moderate pace' },
    ]
  },
  {
    day: 'Wednesday', title: 'Shoulders, PT & Conditioning', exercises: [
      { name: 'Physical Therapy', sets: '10–15 min', rest: '—', note: 'NON-NEGOTIABLE. Always first.' },
      { name: 'Ab Circuit (3 rounds)', sets: 'Plank 30–60s / Leg Raises 12–15 / Crunches 15–20', rest: '—' },
      { name: 'Cable Lateral Raises', sets: '4×12–15', rest: '60–90 sec', note: 'Slight forward lean. +2.5 lbs only.' },
      { name: 'Seated DB Lateral Raises', sets: '3×12–15', rest: '60 sec' },
      { name: 'Cable Face Pulls', sets: '3×12–15', rest: '60–90 sec', note: 'Critical for shoulder health.' },
      { name: 'DB Rear Delt Fly Incline', sets: '3×12–15', rest: '60 sec' },
      { name: 'Farmers Carry', sets: '3×120–160 steps', rest: '90 sec', note: '50–70 lbs/hand.' },
      { name: 'Jump Rope Intervals', sets: '3×2 min on/60 sec off', rest: '—', note: 'Alt: 10 min Stairmaster.' },
    ]
  },
  {
    day: 'Thursday', title: 'Pull (Back & Biceps)', exercises: [
      { name: 'One-Arm DB Row', sets: '4×8–12 each', rest: '2.5–3 min' },
      { name: 'Seated Cable Row Close Grip', sets: '3×8–12', rest: '2–3 min' },
      { name: 'Lat Pulldown Wide Grip', sets: '3×10–12', rest: '2 min', note: 'Builds V-taper.' },
      { name: 'Barbell Curl 90/90/180 Method', sets: '3×8–10', rest: '90 sec' },
      { name: 'Incline DB Curl', sets: '3×10–12', rest: '60–90 sec', note: 'Priority biceps movement.' },
    ]
  },
  {
    day: 'Friday', title: 'Posterior Chain + Biceps', exercises: [
      { name: 'Trap Bar Deadlift', sets: '4×6–8', rest: '3–4 min' },
      { name: 'Seated Leg Curl', sets: '3×10–12', rest: '90 sec', note: '1-sec pause at contraction.' },
      { name: 'Bulgarian Split Squat DB', sets: '3×10–12 each', rest: '2 min' },
      { name: 'Standing Calf Raises', sets: '3×12–15', rest: '60 sec' },
      { name: 'Hammer Curls', sets: '3×10–12', rest: '60–90 sec' },
      { name: 'Reverse Barbell Curl', sets: '2×10–12', rest: '60 sec' },
      { name: 'Stairmaster Finisher', sets: '10–15 min', rest: 'moderate-high intensity' },
    ]
  },
  {
    day: 'Saturday', title: 'Optional Active Recovery', exercises: [
      { name: 'Basketball / Barre / Yoga / Walk', sets: '30–60 min', rest: '—' },
    ]
  },
  {
    day: 'Sunday', title: 'Full Rest', exercises: []
  },
]

// ─── Meal Plans ──────────────────────────────────────────────────────────────

const MEALS = [
  { name: 'Meal 1 — Oatmeal + Eggs', timing: 'First meal', items: '80g dry oats, 1 tbsp peanut butter, 100g blueberries, 1 scoop protein powder, 2 whole eggs', macros: '47g protein | 63g carbs | 18g fat | ~580 kcal' },
  { name: 'Meal 2 — Ground Turkey Quinoa Bowl', timing: 'Lunch', items: '170g cooked ground turkey 93% lean, 120g cooked quinoa, 100g broccoli, 50g spinach', macros: '52g protein | 40g carbs | 14g fat | ~470 kcal' },
  { name: 'Meal 3 — Salmon Rice Bowl', timing: 'Dinner', items: '1 can salmon 150g drained, 150g cooked brown rice, 150g sweet potato, 100g spinach or broccoli', macros: '45g protein | 55g carbs | 12g fat | ~520 kcal' },
  { name: 'Snack — Protein Shake', timing: 'Anytime', items: '1 scoop protein powder, 240ml almond milk, 1 banana, optional 28g Skinny Pop', macros: '30g protein | 43g carbs | 7g fat | ~350 kcal' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function today(): string {
  return dateStr(new Date())
}

function getDayNumber(): number {
  const start = new Date(START_DATE)
  const now = new Date(today())
  const diff = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return Math.max(0, Math.min(diff + 1, TOTAL_DAYS))
}

function getWeekNumber(): number {
  return Math.ceil(getDayNumber() / 7)
}

function getPhase(): { phase: number; name: string; weeks: string } {
  const w = getWeekNumber()
  if (w <= 4) return { phase: 1, name: 'Foundation', weeks: '1–4' }
  if (w <= 8) return { phase: 2, name: 'Build', weeks: '5–8' }
  return { phase: 3, name: 'Peak', weeks: '9–13' }
}

function getWeekDates(dateString: string): string[] {
  const d = new Date(dateString)
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

const EMPTY_DATA: AppData = { habits: {}, workoutLogs: {}, weeklyLogs: [], nutritionLogs: {} }

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_DATA }
    const parsed = JSON.parse(raw)
    return { ...EMPTY_DATA, ...parsed }
  } catch {
    return { ...EMPTY_DATA }
  }
}

function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function getStreak(data: AppData): number {
  let streak = 0
  const d = new Date(today())
  // Start from yesterday if today isn't complete yet
  const todayHabits = data.habits[today()] || {}
  const todayCount = HABITS.filter(h => todayHabits[h.id]).length
  const todayPct = todayCount / HABITS.length
  if (todayPct < 0.7) d.setDate(d.getDate() - 1)

  while (true) {
    const ds = dateStr(d)
    if (ds < START_DATE) break
    const habits = data.habits[ds] || {}
    const completed = HABITS.filter(h => habits[h.id]).length
    if (completed / HABITS.length >= 0.7) {
      streak++
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

// ─── Shared Styles ───────────────────────────────────────────────────────────

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

// ─── App Component ───────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState<'today' | 'workout' | 'nutrition' | 'progress' | 'plan'>('today')
  const [data, setData] = useState<AppData>(loadData)
  const [selectedDate, setSelectedDate] = useState(today())

  const updateData = useCallback((updater: (prev: AppData) => AppData) => {
    setData(prev => {
      const next = updater(prev)
      saveData(next)
      return next
    })
  }, [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: FONT, background: COLORS.bg }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: COLORS.bg,
        borderBottom: `1px solid ${COLORS.mist}`,
        flexShrink: 0,
      }}>
        <img src="/stack_weeks_logo_transparent.png" style={{ height: 22, width: 'auto' }} alt="Stack Weeks" />
        <div style={{ fontSize: 12, color: COLORS.slate, fontWeight: 600 }}>
          Day {getDayNumber()} / {TOTAL_DAYS} — Phase {getPhase().phase}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 16px 16px', WebkitOverflowScrolling: 'touch' }}>
        {tab === 'today' && <TodayTab data={data} updateData={updateData} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />}
        {tab === 'workout' && <WorkoutTab data={data} updateData={updateData} />}
        {tab === 'nutrition' && <NutritionTab data={data} updateData={updateData} />}
        {tab === 'progress' && <ProgressTab data={data} updateData={updateData} />}
        {tab === 'plan' && <PlanTab />}
      </div>

      {/* Bottom Nav */}
      <div style={{
        display: 'flex',
        borderTop: `1px solid ${COLORS.mist}`,
        background: COLORS.white,
        paddingBottom: 'env(safe-area-inset-bottom)',
        flexShrink: 0,
      }}>
        {([
          { key: 'today', label: 'Today', icon: '📋' },
          { key: 'workout', label: 'Workout', icon: '💪' },
          { key: 'nutrition', label: 'Nutrition', icon: '🥗' },
          { key: 'progress', label: 'Progress', icon: '📈' },
          { key: 'plan', label: 'Plan', icon: '📖' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              padding: '10px 4px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 600,
              fontFamily: FONT,
              color: tab === t.key ? COLORS.primary : COLORS.slate,
              borderTop: tab === t.key ? `2px solid ${COLORS.primary}` : '2px solid transparent',
              transition: 'color 0.2s',
            }}
          >
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── TODAY TAB ───────────────────────────────────────────────────────────────

function TodayTab({ data, updateData, selectedDate, setSelectedDate }: {
  data: AppData; updateData: (fn: (p: AppData) => AppData) => void;
  selectedDate: string; setSelectedDate: (d: string) => void
}) {
  const dayHabits = data.habits[selectedDate] || {}
  const completedCount = HABITS.filter(h => dayHabits[h.id]).length
  const pct = Math.round((completedCount / HABITS.length) * 100)
  const weekDates = getWeekDates(selectedDate)
  const dayName = getDayOfWeekName(selectedDate)

  const toggleHabit = (habitId: string) => {
    updateData(prev => {
      const habits = { ...prev.habits }
      const dayData = { ...(habits[selectedDate] || {}) }
      dayData[habitId] = !dayData[habitId]
      habits[selectedDate] = dayData
      return { ...prev, habits }
    })
  }

  const categories = [...new Set(HABITS.map(h => h.category))]

  return (
    <div>
      {/* Date selector */}
      <div style={{ display: 'flex', gap: 4, padding: '12px 0 8px', justifyContent: 'center' }}>
        {weekDates.map(d => {
          const dd = new Date(d + 'T12:00:00')
          const dayLabel = dd.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)
          const dateNum = dd.getDate()
          const isSelected = d === selectedDate
          const dayData = data.habits[d] || {}
          const dayCompleted = HABITS.filter(h => dayData[h.id]).length
          const dayPct = dayCompleted / HABITS.length
          return (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              style={{
                width: 42,
                padding: '6px 0',
                borderRadius: 12,
                border: isSelected ? `2px solid ${COLORS.primary}` : '2px solid transparent',
                background: isSelected ? COLORS.primary : dayPct >= 0.7 ? `${COLORS.gold}20` : COLORS.stone,
                color: isSelected ? COLORS.white : COLORS.ink,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                fontFamily: FONT,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: 10, opacity: 0.7 }}>{dayLabel}</span>
              <span>{dateNum}</span>
              {dayPct >= 0.7 && !isSelected && <span style={{ fontSize: 8 }}>✓</span>}
            </button>
          )
        })}
      </div>

      {/* Day heading */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.ink }}>{dayName}</div>
        <div style={{ fontSize: 13, color: COLORS.slate }}>{completedCount}/{HABITS.length} habits — {pct}%</div>
        {/* Progress bar */}
        <div style={{ height: 6, borderRadius: 3, background: COLORS.mist, marginTop: 8, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 3,
            background: pct >= 70 ? COLORS.gold : COLORS.primary,
            transition: 'width 0.3s, background 0.3s',
          }} />
        </div>
      </div>

      {/* Habits by category */}
      {categories.map(cat => (
        <div key={cat}>
          <div style={sectionTitleStyle}>{cat}</div>
          {HABITS.filter(h => h.category === cat).map(habit => {
            const checked = !!dayHabits[habit.id]
            const hasTwoPronged = !!habit.weeklyTarget
            let weeklyCount = 0
            if (hasTwoPronged) {
              weekDates.forEach(wd => {
                const dd = data.habits[wd] || {}
                if (dd[habit.id]) weeklyCount++
              })
            }
            return (
              <div
                key={habit.id}
                onClick={() => toggleHabit(habit.id)}
                style={{
                  ...cardStyle,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  transition: 'transform 0.15s',
                  background: checked ? `${COLORS.primary}08` : COLORS.white,
                  borderColor: checked ? `${COLORS.primary}30` : COLORS.mist,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                  background: checked ? `${COLORS.primary}15` : COLORS.stone,
                  transition: 'background 0.2s',
                }}>
                  {habit.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.ink }}>{habit.label}</div>
                  <div style={{ fontSize: 12, color: COLORS.slate }}>{habit.desc}</div>
                  {hasTwoPronged && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <div style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: weeklyCount >= habit.weeklyTarget! ? COLORS.gold : `${COLORS.primary}15`,
                        color: weeklyCount >= habit.weeklyTarget! ? COLORS.white : COLORS.primary,
                      }}>
                        {weeklyCount >= habit.weeklyTarget! ? '✓ ' : ''}{weeklyCount}/{habit.weeklyTarget}
                      </div>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {weekDates.map((wd, i) => {
                          const dd = data.habits[wd] || {}
                          return (
                            <div key={i} style={{
                              width: 6, height: 6, borderRadius: 3,
                              background: dd[habit.id] ? (weeklyCount >= habit.weeklyTarget! ? COLORS.gold : COLORS.primary) : COLORS.mist,
                            }} />
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  border: `2px solid ${checked ? COLORS.primary : COLORS.mist}`,
                  background: checked ? COLORS.primary : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                  animation: checked ? 'checkPop 0.3s ease' : 'none',
                }}>
                  {checked && <span style={{ color: COLORS.white, fontSize: 14, fontWeight: 700 }}>✓</span>}
                </div>
              </div>
            )
          })}
        </div>
      ))}
      <div style={{ height: 20 }} />
    </div>
  )
}

// ─── WORKOUT TAB ─────────────────────────────────────────────────────────────

function WorkoutTab({ data, updateData }: { data: AppData; updateData: (fn: (p: AppData) => AppData) => void }) {
  const dayName = getDayOfWeekName(today())
  const todayWorkout = WORKOUT_DAYS.find(w => w.day === dayName)
  const phase = getPhase()
  const [expandedDay, setExpandedDay] = useState<string | null>(dayName)
  const setLog = (key: string, value: string) => {
    updateData(prev => {
      const workoutLogs = { ...prev.workoutLogs }
      const dayLogs = { ...(workoutLogs[today()] || {}) }
      dayLogs[key] = value
      workoutLogs[today()] = dayLogs
      return { ...prev, workoutLogs }
    })
  }

  const todayLogs = data.workoutLogs[today()] || {}

  return (
    <div>
      {/* Phase banner */}
      <div style={{
        ...cardStyle,
        marginTop: 12,
        background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.dark})`,
        color: COLORS.white,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.8 }}>
          Phase {phase.phase} — {phase.name}
        </div>
        <div style={{ fontSize: 13, marginTop: 4, opacity: 0.9 }}>Weeks {phase.weeks}</div>
        {phase.phase >= 2 && (
          <div style={{ fontSize: 11, marginTop: 6, padding: '4px 10px', background: 'rgba(255,255,255,0.15)', borderRadius: 8, display: 'inline-block' }}>
            {phase.phase === 2 ? 'Seated DB OH Press added (3×8–10)' : 'Seated DB OH Press primary (4×6–10)'}
          </div>
        )}
      </div>

      {/* Today's workout highlight */}
      {todayWorkout && todayWorkout.exercises.length > 0 && (
        <div>
          <div style={sectionTitleStyle}>TODAY — {todayWorkout.day.toUpperCase()}</div>
          <div style={{ ...cardStyle, borderColor: `${COLORS.primary}30` }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink, marginBottom: 12 }}>
              {todayWorkout.title}
            </div>
            {todayWorkout.exercises.map((ex, ei) => (
              <div key={ei} style={{
                padding: '10px 0',
                borderTop: ei > 0 ? `1px solid ${COLORS.mist}` : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{ei + 1}. {ex.name}</div>
                    <div style={{ fontSize: 12, color: COLORS.slate }}>{ex.sets} — Rest: {ex.rest}</div>
                    {ex.note && <div style={{ fontSize: 11, color: COLORS.gold, fontStyle: 'italic', marginTop: 2 }}>{ex.note}</div>}
                  </div>
                </div>
                {/* Set logging */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {Array.from({ length: parseInt(ex.sets.charAt(0)) || 3 }).map((_, si) => (
                    <div key={si} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: COLORS.slate, width: 16 }}>S{si + 1}</span>
                      <input
                        type="number"
                        placeholder="lbs"
                        value={todayLogs[`${ei}-${si}-w`] || ''}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setLog(`${ei}-${si}-w`, e.target.value)}
                        style={{ ...inputStyle, width: 52, padding: '6px 8px', fontSize: 13, textAlign: 'center' }}
                      />
                      <input
                        type="number"
                        placeholder="reps"
                        value={todayLogs[`${ei}-${si}-r`] || ''}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setLog(`${ei}-${si}-r`, e.target.value)}
                        style={{ ...inputStyle, width: 48, padding: '6px 8px', fontSize: 13, textAlign: 'center' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full week view */}
      <div style={sectionTitleStyle}>FULL WEEK</div>
      {WORKOUT_DAYS.map(wd => {
        const isExpanded = expandedDay === wd.day
        const isToday = wd.day === dayName
        return (
          <div key={wd.day} style={{
            ...cardStyle,
            cursor: 'pointer',
            borderColor: isToday ? `${COLORS.primary}40` : COLORS.mist,
          }}
            onClick={() => setExpandedDay(isExpanded ? null : wd.day)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink }}>{wd.day}</span>
                <span style={{ fontSize: 13, color: COLORS.slate, marginLeft: 8 }}>{wd.title}</span>
              </div>
              <span style={{ fontSize: 16, color: COLORS.slate, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
            </div>
            {isExpanded && wd.exercises.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {wd.exercises.map((ex, i) => (
                  <div key={i} style={{ padding: '6px 0', fontSize: 13, color: COLORS.ink, borderTop: i > 0 ? `1px solid ${COLORS.mist}` : 'none' }}>
                    <span style={{ fontWeight: 600 }}>{i + 1}. {ex.name}</span>
                    <span style={{ color: COLORS.slate }}> — {ex.sets}</span>
                    {ex.note && <div style={{ fontSize: 11, color: COLORS.gold, fontStyle: 'italic' }}>{ex.note}</div>}
                  </div>
                ))}
              </div>
            )}
            {isExpanded && wd.exercises.length === 0 && (
              <div style={{ marginTop: 8, fontSize: 13, color: COLORS.slate, fontStyle: 'italic' }}>Complete rest. No training.</div>
            )}
          </div>
        )
      })}
      <div style={{ height: 20 }} />
    </div>
  )
}

// ─── NUTRITION TAB ───────────────────────────────────────────────────────────

function NutritionTab({ data, updateData }: { data: AppData; updateData: (fn: (p: AppData) => AppData) => void }) {
  const dayName = getDayOfWeekName(today())
  const isRest = dayName === 'Sunday' || dayName === 'Saturday'
  const cals = isRest ? 2200 : 2400
  const carbs = isRest ? 170 : 210
  const todayLog = data.nutritionLogs[today()] || { calories: '', protein: '', carbs: '', fat: '' }
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null)

  const updateNutrition = (field: string, value: string) => {
    updateData(prev => {
      const nutritionLogs = { ...prev.nutritionLogs }
      const current = nutritionLogs[today()] || { calories: '', protein: '', carbs: '', fat: '' }
      nutritionLogs[today()] = { ...current, [field]: value }
      return { ...prev, nutritionLogs }
    })
  }

  const macroBar = (label: string, current: number, target: number, color: string) => {
    const pct = Math.min((current / target) * 100, 100)
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: COLORS.ink, marginBottom: 4 }}>
          <span>{label}</span>
          <span>{current || 0} / {target}g</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: COLORS.mist, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: color, transition: 'width 0.3s' }} />
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Daily targets */}
      <div style={{ ...cardStyle, marginTop: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink, marginBottom: 12 }}>
          {isRest ? 'Rest' : 'Training'} Day Targets
        </div>
        {macroBar('Calories', parseInt(todayLog.calories) || 0, cals, COLORS.primary)}
        {macroBar('Protein', parseInt(todayLog.protein) || 0, 200, '#22c55e')}
        {macroBar('Carbs', parseInt(todayLog.carbs) || 0, carbs, '#f59e0b')}
        {macroBar('Fat', parseInt(todayLog.fat) || 0, 65, '#ef4444')}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
          {[
            { label: 'Calories', field: 'calories' },
            { label: 'Protein (g)', field: 'protein' },
            { label: 'Carbs (g)', field: 'carbs' },
            { label: 'Fat (g)', field: 'fat' },
          ].map(f => (
            <div key={f.field}>
              <label style={{ fontSize: 11, color: COLORS.slate, fontWeight: 600 }}>{f.label}</label>
              <input
                type="number"
                value={(todayLog as Record<string, string>)[f.field] || ''}
                onChange={e => updateNutrition(f.field, e.target.value)}
                style={{ ...inputStyle, marginTop: 4, fontSize: 14 }}
                placeholder="0"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Fasting Window */}
      <div style={{ ...cardStyle, background: `linear-gradient(135deg, ${COLORS.dark}, ${COLORS.primary})`, color: COLORS.white }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>🕗 Fasting Window</div>
        <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>
          Stop eating at <strong>8:00 PM</strong> — every day, no exceptions.
        </div>
        <div style={{ fontSize: 12, marginTop: 8, opacity: 0.75 }}>
          Early AM training → 7–8AM / 12:30–1:30PM / 7–8PM (~11hr fast)<br />
          Mid-morning → 9:30–10:30AM / 3PM / 7:30PM (~10hr fast)<br />
          Afternoon → 11AM / 3PM / 7–8PM (~9hr fast)
        </div>
      </div>

      {/* Cheat meal */}
      <div style={{
        ...cardStyle,
        background: `linear-gradient(135deg, ${COLORS.gold}20, ${COLORS.gold}08)`,
        border: `1px solid ${COLORS.gold}40`,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold }}>🏆 Weekly Cheat Meal</div>
        <div style={{ fontSize: 13, color: COLORS.ink, marginTop: 4 }}>
          1 planned cheat MEAL per week (not a cheat day). Enjoy it guilt-free — it's built into the plan.
        </div>
      </div>

      {/* Meal plan */}
      <div style={sectionTitleStyle}>MEAL PLAN</div>
      {MEALS.map((meal, i) => (
        <div
          key={i}
          style={{ ...cardStyle, cursor: 'pointer' }}
          onClick={() => setExpandedMeal(expandedMeal === i ? null : i)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{meal.name}</div>
            <span style={{ fontSize: 16, color: COLORS.slate, transform: expandedMeal === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
          </div>
          <div style={{ fontSize: 12, color: COLORS.primary, fontWeight: 600, marginTop: 4 }}>{meal.macros}</div>
          {expandedMeal === i && (
            <div style={{ fontSize: 13, color: COLORS.slate, marginTop: 8, padding: '8px 0', borderTop: `1px solid ${COLORS.mist}`, lineHeight: 1.6 }}>
              {meal.items}
            </div>
          )}
        </div>
      ))}

      {/* Foods to limit */}
      <div style={sectionTitleStyle}>FOODS TO LIMIT</div>
      <div style={{ ...cardStyle, fontSize: 13, color: COLORS.ink, lineHeight: 1.6 }}>
        Candy, chips outside planned snack, late-night eating past 8PM, excess dark chocolate.
      </div>
      <div style={{ height: 20 }} />
    </div>
  )
}

// ─── PROGRESS TAB ────────────────────────────────────────────────────────────

function ProgressTab({ data, updateData }: { data: AppData; updateData: (fn: (p: AppData) => AppData) => void }) {
  const streak = getStreak(data)
  const dayNum = getDayNumber()
  const weekNum = getWeekNumber()
  const weeklyLogs = data.weeklyLogs
  const [showForm, setShowForm] = useState(false)
  const [formWeight, setFormWeight] = useState('')
  const [formBF, setFormBF] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const saveWeeklyLog = () => {
    const newLog: WeeklyLog = { week: weekNum, date: today(), weight: formWeight, bodyFat: formBF, notes: formNotes }
    updateData(prev => {
      const weeklyLogs = [...prev.weeklyLogs]
      const existing = weeklyLogs.findIndex(l => l.week === weekNum)
      if (existing >= 0) weeklyLogs[existing] = newLog
      else weeklyLogs.push(newLog)
      return { ...prev, weeklyLogs }
    })
    setShowForm(false)
    setFormWeight('')
    setFormBF('')
    setFormNotes('')
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stackweeks_backup_${today()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string)
        saveData(imported)
        window.location.reload()
      } catch {
        alert('Invalid backup file')
      }
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
      {/* Streak */}
      <div style={{
        ...cardStyle,
        marginTop: 12,
        textAlign: 'center',
        background: streak > 0 ? `linear-gradient(135deg, ${COLORS.gold}15, ${COLORS.gold}05)` : COLORS.white,
        border: streak > 0 ? `1px solid ${COLORS.gold}40` : `1px solid ${COLORS.mist}`,
      }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: streak > 0 ? COLORS.gold : COLORS.slate }}>
          {streak > 0 && (
            <span style={{
              backgroundImage: `linear-gradient(90deg, ${COLORS.gold}, #E8D48B, ${COLORS.gold})`,
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'goldShimmer 3s linear infinite',
            }}>
              🔥 {streak}
            </span>
          )}
          {streak === 0 && '0'}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: streak > 0 ? COLORS.gold : COLORS.slate }}>
          Day Streak
        </div>
        <div style={{ fontSize: 12, color: COLORS.slate, marginTop: 4 }}>
          ≥70% habits completed = streak day
        </div>
      </div>

      {/* Overall progress */}
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink, marginBottom: 8 }}>Challenge Progress</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: COLORS.slate, marginBottom: 6 }}>
          <span>Day {dayNum} of {TOTAL_DAYS}</span>
          <span>{Math.round((dayNum / TOTAL_DAYS) * 100)}%</span>
        </div>
        <div style={{ height: 10, borderRadius: 5, background: COLORS.mist, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(dayNum / TOTAL_DAYS) * 100}%`,
            borderRadius: 5,
            background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.dark})`,
            transition: 'width 0.5s',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COLORS.slate, marginTop: 6 }}>
          <span>Mar 23</span>
          <span>Jun 21</span>
        </div>
      </div>

      {/* Starting metrics */}
      <div style={sectionTitleStyle}>STARTING METRICS (MAR 19)</div>
      <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Weight', value: '231.2 lbs' },
          { label: 'Body Fat', value: '17.8%' },
          { label: 'Lean Mass', value: '190.2 lbs' },
          { label: 'Skeletal Muscle', value: '122.8 lbs' },
        ].map(m => (
          <div key={m.label} style={{ padding: 8, background: COLORS.stone, borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: COLORS.slate, fontWeight: 600 }}>{m.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink, marginTop: 2 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Milestones */}
      <div style={sectionTitleStyle}>MILESTONES</div>
      {milestones.map(m => (
        <div key={m.week} style={{
          ...cardStyle,
          borderLeft: `3px solid ${weekNum >= m.week ? COLORS.gold : COLORS.mist}`,
          opacity: weekNum >= m.week ? 1 : 0.7,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: weekNum >= m.week ? COLORS.gold : COLORS.ink }}>
            Week {m.week} {weekNum >= m.week ? '✓' : ''}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{m.target}</div>
          <div style={{ fontSize: 12, color: COLORS.slate, fontStyle: 'italic' }}>"{m.note}"</div>
        </div>
      ))}

      {/* Weekly check-in */}
      <div style={sectionTitleStyle}>WEEKLY CHECK-INS</div>
      <button
        onClick={() => setShowForm(!showForm)}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: 12,
          border: `2px dashed ${COLORS.primary}40`,
          background: `${COLORS.primary}08`,
          color: COLORS.primary,
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          marginBottom: 12,
          fontFamily: FONT,
        }}
      >
        + Log Week {weekNum} Check-In
      </button>

      {showForm && (
        <div style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: COLORS.slate, fontWeight: 600 }}>Weight (lbs)</label>
              <input value={formWeight} onChange={e => setFormWeight(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} placeholder="0" type="number" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: COLORS.slate, fontWeight: 600 }}>Body Fat %</label>
              <input value={formBF} onChange={e => setFormBF(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} placeholder="0" type="number" step="0.1" />
            </div>
          </div>
          <label style={{ fontSize: 11, color: COLORS.slate, fontWeight: 600 }}>Notes</label>
          <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} style={{ ...inputStyle, marginTop: 4, minHeight: 60, resize: 'vertical' }} placeholder="How was the week?" />
          <button
            onClick={saveWeeklyLog}
            style={{
              width: '100%', marginTop: 10, padding: 12, borderRadius: 12,
              background: COLORS.primary, color: COLORS.white, border: 'none',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: FONT,
            }}
          >
            Save Check-In
          </button>
        </div>
      )}

      {weeklyLogs.slice().reverse().map(log => (
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

      {/* Backup/Restore */}
      <div style={sectionTitleStyle}>DATA</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={exportData}
          style={{
            flex: 1, padding: 12, borderRadius: 12,
            background: COLORS.primary, color: COLORS.white, border: 'none',
            fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: FONT,
          }}
        >
          📥 Export Backup
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            flex: 1, padding: 12, borderRadius: 12,
            background: COLORS.stone, color: COLORS.ink, border: `1px solid ${COLORS.mist}`,
            fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: FONT,
          }}
        >
          📤 Restore
        </button>
        <input ref={fileRef} type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
      </div>
      <div style={{ height: 20 }} />
    </div>
  )
}

// ─── PLAN TAB ────────────────────────────────────────────────────────────────

function PlanTab() {
  const [expanded, setExpanded] = useState<string | null>(null)

  const toggle = (key: string) => setExpanded(expanded === key ? null : key)

  const nonNegotiables = [
    '200g protein/day — everything else is secondary',
    'Wednesday is the most important training day — never skip',
    'PT before every Wednesday session — always',
    'Log every set with weight and reps',
    '7 hours sleep is the floor, not the goal',
  ]

  const sections: { key: string; title: string; content: string }[] = [
    { key: 'goal', title: 'Program Goal', content: '91-day body recomposition: reduce body fat from ~18% to 12–14% while maintaining or increasing lean mass. Target weight: 213–218 lbs by June 21, 2026.' },
    { key: 'injury', title: 'Injury Protocol', content: 'Right shoulder labral tear, 90–95% recovered.\n\n• No barbell overhead press\n• No upright rows\n• No behind-the-neck movements\n• All lateral raises at slight forward angle\n• PT every Wednesday — non-negotiable\n• If PT skipped 3+ days → drop 1 set from all pressing that week' },
    { key: 'overload', title: 'Progressive Overload', content: '• Dumbbells: +2.5–5 lbs\n• Cables: +5 lbs\n• Barbell: +5 lbs\n• Lateral raises: +2.5 lbs only\n• Overhead press: +2.5–5 lbs in Phase II–III\n• Log every set — no guessing' },
    { key: 'deload', title: 'Deload Schedule', content: '40–50% volume reduction at the end of Week 8, before Phase III begins. Maintain intensity, reduce sets.' },
    { key: 'recovery', title: 'Recovery Stack', content: '• Magnesium glycinate 200–400mg, 30–60 min before bed\n• Electrolytes on leg days and Wednesdays\n• Coconut water daily' },
    { key: 'foods', title: 'Foods to Limit', content: '• Candy\n• Chips outside planned snack\n• Late-night eating past 8PM\n• Excess dark chocolate' },
    { key: 'tracking', title: 'Tracking Protocol', content: '• Use weekly average weight, not daily\n• Photos every 2 weeks, same lighting\n• Body fat measured consistently (same method, same time)' },
  ]

  return (
    <div>
      {/* Non-negotiables */}
      <div style={{
        ...cardStyle,
        marginTop: 12,
        background: `linear-gradient(135deg, ${COLORS.primary}08, ${COLORS.primary}03)`,
        border: `1px solid ${COLORS.primary}25`,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 10 }}>
          ⚡ Non-Negotiables
        </div>
        {nonNegotiables.map((item, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8, alignItems: 'flex-start',
            padding: '6px 0',
            borderTop: i > 0 ? `1px solid ${COLORS.primary}10` : 'none',
          }}>
            <span style={{
              minWidth: 20, height: 20, borderRadius: 6,
              background: COLORS.primary, color: COLORS.white,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, marginTop: 1,
            }}>{i + 1}</span>
            <span style={{ fontSize: 14, color: COLORS.ink, lineHeight: 1.4 }}>{item}</span>
          </div>
        ))}
      </div>

      {/* Phase overview */}
      <div style={sectionTitleStyle}>PHASES</div>
      <div style={{ ...cardStyle }}>
        {[
          { p: 'I', w: 'Weeks 1–4', name: 'Foundation', note: 'No overhead pressing.' },
          { p: 'II', w: 'Weeks 5–8', name: 'Build', note: 'Seated DB OH Press introduced (3×8–10) on Wed after PT/abs.' },
          { p: 'III', w: 'Weeks 9–13', name: 'Peak', note: 'Seated DB OH Press becomes primary compound (4×6–10).' },
        ].map((ph, i) => (
          <div key={i} style={{
            padding: '10px 0',
            borderTop: i > 0 ? `1px solid ${COLORS.mist}` : 'none',
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{
                padding: '2px 8px', borderRadius: 6,
                background: COLORS.primary, color: COLORS.white,
                fontSize: 12, fontWeight: 700,
              }}>Phase {ph.p}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>{ph.name}</span>
              <span style={{ fontSize: 12, color: COLORS.slate }}>({ph.w})</span>
            </div>
            <div style={{ fontSize: 13, color: COLORS.slate, marginTop: 4, paddingLeft: 4 }}>{ph.note}</div>
          </div>
        ))}
      </div>

      {/* Accordion sections */}
      <div style={sectionTitleStyle}>REFERENCE</div>
      {sections.map(s => (
        <div key={s.key} style={{ ...cardStyle, cursor: 'pointer' }} onClick={() => toggle(s.key)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{s.title}</span>
            <span style={{
              fontSize: 16, color: COLORS.slate,
              transform: expanded === s.key ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}>▾</span>
          </div>
          {expanded === s.key && (
            <div style={{
              marginTop: 10, paddingTop: 10,
              borderTop: `1px solid ${COLORS.mist}`,
              fontSize: 13, color: COLORS.ink, lineHeight: 1.6,
              whiteSpace: 'pre-line',
            }}>
              {s.content}
            </div>
          )}
        </div>
      ))}
      <div style={{ height: 20 }} />
    </div>
  )
}
