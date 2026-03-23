import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Request notification permission after 2 seconds
setTimeout(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}, 2000)

// Schedule daily notification
function scheduleNotification() {
  const now = new Date()
  const key = 'sw_notif_time'
  const stored = localStorage.getItem(key)
  let scheduledHour: number, scheduledMin: number

  if (stored) {
    const parsed = JSON.parse(stored)
    if (parsed.date === now.toDateString()) {
      scheduledHour = parsed.hour
      scheduledMin = parsed.min
    } else {
      scheduledHour = 19 + Math.floor(Math.random() * 3)
      scheduledMin = Math.floor(Math.random() * 60)
      localStorage.setItem(key, JSON.stringify({ date: now.toDateString(), hour: scheduledHour, min: scheduledMin }))
    }
  } else {
    scheduledHour = 19 + Math.floor(Math.random() * 3)
    scheduledMin = Math.floor(Math.random() * 60)
    localStorage.setItem(key, JSON.stringify({ date: now.toDateString(), hour: scheduledHour, min: scheduledMin }))
  }

  const target = new Date()
  target.setHours(scheduledHour, scheduledMin, 0, 0)
  if (now >= target) return

  const delay = target.getTime() - now.getTime()
  setTimeout(() => {
    const messages = [
      "Did you hit your water today? 💧 Log it in Stack Weeks.",
      "Macros on track? 🥗 Check in before 8PM.",
      "Workout logged? ⚡ Don't break the streak.",
      "Bedtime soon. Invisalign in? Skincare done? 🦷✨",
      "How are the steps looking today? 👟 Log before bed.",
      "Pray, reflect, check in. 🙏🏾 Stack the week.",
    ]
    const msg = messages[Math.floor(Math.random() * messages.length)]
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Stack Weeks', { body: msg, icon: '/icon-192.png' })
    }
  }, delay)
}

scheduleNotification()
