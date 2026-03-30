import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Request notification permission
setTimeout(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(() => scheduleDailyNotifications())
  } else if ('Notification' in window && Notification.permission === 'granted') {
    scheduleDailyNotifications()
  }
}, 2000)

// Section 8c: local date key
function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getWeekNumber(): number {
  const START_DATE = '2026-03-23'
  const start = new Date(START_DATE + 'T12:00:00')
  const now = new Date(getLocalDateKey() + 'T12:00:00')
  const diff = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return Math.max(1, Math.ceil((diff + 1) / 7))
}

// Section 7: 3 fixed daily notifications in device local timezone
function scheduleDailyNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const now = new Date()
  const dateKey = getLocalDateKey(now)
  const stored = localStorage.getItem('sw_notif_scheduled')
  if (stored === dateKey) return // already scheduled today

  localStorage.setItem('sw_notif_scheduled', dateKey)

  const isSunday = now.getDay() === 0
  const weekNum = getWeekNumber()

  const notifications = [
    {
      hour: 7, min: 0,
      body: 'Good morning. Prayer done? Invisalign out? Start the day with intention. 🙏🏾',
    },
    {
      hour: 13, min: 0,
      body: "Halfway through the day. Water on track? First two meals handled? Don't let the afternoon slip. 💧🥗",
    },
    {
      hour: 20, min: 0,
      body: isSunday
        ? `End of Week ${weekNum}. How did it go? Record your weekly reflection. 🎙️`
        : 'Final stretch. Log your macros, get your steps in, and start winding down. Bed by 10:30. 🌙',
    },
  ]

  for (const notif of notifications) {
    const target = new Date()
    target.setHours(notif.hour, notif.min, 0, 0)
    const delay = target.getTime() - now.getTime()
    if (delay <= 0) continue
    setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Stack Weeks', { body: notif.body, icon: '/icon-192.png' })
      }
    }, delay)
  }
}
