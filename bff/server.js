'use strict'

const express = require('express')
const fs = require('fs')

// --- Config ---
// Si /data/options.json existe (HA addon), on lit les valeurs dedans
if (fs.existsSync('/data/options.json')) {
  try {
    const opts = JSON.parse(fs.readFileSync('/data/options.json', 'utf8'))
    if (opts.mealie_url) process.env.MEALIE_URL = opts.mealie_url
    if (opts.mealie_token) process.env.MEALIE_TOKEN = opts.mealie_token
  } catch (e) {
    console.error('[BFF] Failed to read /data/options.json:', e.message)
  }
}

const MEALIE_URL = (process.env.MEALIE_URL ?? 'http://localhost:9000').replace(/\/$/, '')
const MEALIE_TOKEN = process.env.MEALIE_TOKEN ?? ''
const PORT = parseInt(process.env.PORT ?? '3001', 10)

// --- Constants ---
const SLOT_HOURS = { breakfast: 8, lunch: 12, dinner: 20 }
const SLOT_LABELS = { breakfast: 'Petit-déjeuner', lunch: 'Déjeuner', dinner: 'Dîner' }
const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const MONTHS_FR = ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.']

// --- Helpers ---
function toDateStr(d) {
  return d.toISOString().split('T')[0]
}

function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function formatDisplay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${DAYS_FR[d.getDay()].slice(0, 3)}. ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`
}

function formatLabel(dateStr, offsetFromToday) {
  if (offsetFromToday === 0) return "Aujourd'hui"
  if (offsetFromToday === 1) return 'Demain'
  const d = new Date(dateStr + 'T12:00:00')
  return DAYS_FR[d.getDay()]
}

function formatIngredient(ing) {
  if (ing.display) return ing.display
  const qty = ing.quantity != null ? `${ing.quantity} ` : ''
  const unit = ing.unit?.name ? `${ing.unit.name} ` : ''
  const food = ing.food?.name ?? ing.note ?? ''
  return `${qty}${unit}${food}`.trim()
}

async function fetchMealie(path) {
  const res = await fetch(`${MEALIE_URL}${path}`, {
    headers: { Authorization: `Bearer ${MEALIE_TOKEN}` }
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Mealie ${res.status} on ${path}: ${text}`)
  }
  return res.json()
}

// --- App ---
const app = express()

app.get('/health', (_req, res) => {
  res.json({ ok: true, mealie: MEALIE_URL })
})

// GET /planning?days=3
app.get('/planning', async (req, res) => {
  try {
    const days = Math.max(1, Math.min(parseInt(req.query.days ?? '3', 10) || 3, 14))
    const today = new Date()
    const startStr = toDateStr(today)
    const endStr = toDateStr(addDays(today, days - 1))

    const data = await fetchMealie(
      `/api/households/mealplans?page=1&perPage=-1&start_date=${startStr}&end_date=${endStr}`
    )
    const items = data.items ?? []

    // Group meals by date
    const byDate = {}
    for (const item of items) {
      if (!byDate[item.date]) byDate[item.date] = []
      byDate[item.date].push(item)
    }

    const result = []
    for (let i = 0; i < days; i++) {
      const d = addDays(today, i)
      const dateStr = toDateStr(d)
      const dayMeals = (byDate[dateStr] ?? [])
        .sort((a, b) => (SLOT_HOURS[a.entryType] ?? 12) - (SLOT_HOURS[b.entryType] ?? 12))
        .map(m => ({
          type: m.entryType,
          label: SLOT_LABELS[m.entryType] ?? m.entryType,
          name: m.recipe?.name ?? m.title ?? ''
        }))

      result.push({
        date: dateStr,
        display: formatDisplay(dateStr),
        label: formatLabel(dateStr, i),
        meals: dayMeals
      })
    }

    res.json({ days: result })
  } catch (err) {
    console.error('[/planning]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /next_meal
app.get('/next_meal', async (req, res) => {
  try {
    const now = new Date()
    const todayStr = toDateStr(now)
    const in2daysStr = toDateStr(addDays(now, 2))
    const currentHour = now.getHours()

    const data = await fetchMealie(
      `/api/households/mealplans?page=1&perPage=-1&start_date=${todayStr}&end_date=${in2daysStr}`
    )
    const items = data.items ?? []

    // Sort by date then by slot hour
    const sorted = items
      .map(m => ({ ...m, slotHour: SLOT_HOURS[m.entryType] ?? 12 }))
      .sort((a, b) => a.date.localeCompare(b.date) || a.slotHour - b.slotHour)

    // 1. First upcoming meal today (slot hour >= currentHour)
    let next = sorted.find(m => m.date === todayStr && m.slotHour >= currentHour)

    // 2. If all today's meals have passed → show last planned meal of today (all-day display)
    if (!next) {
      const todayMeals = sorted.filter(m => m.date === todayStr)
      if (todayMeals.length > 0) next = todayMeals[todayMeals.length - 1]
    }

    // 3. No meals today at all → first meal of a future day
    if (!next) {
      next = sorted.find(m => m.date > todayStr)
    }

    if (!next) {
      return res.json({ empty: true })
    }

    const recipe = next.recipe ?? {}
    res.json({
      empty: false,
      type: next.entryType,
      label: SLOT_LABELS[next.entryType] ?? next.entryType,
      date: next.date,
      name: recipe.name ?? next.title ?? '',
      image_url: recipe.id
        ? `${MEALIE_URL}/api/media/recipes/${recipe.id}/images/min-original.webp`
        : '',
      description: recipe.description ?? '',
      ingredients: (recipe.recipeIngredient ?? []).map(formatIngredient).filter(Boolean),
      instructions: (recipe.recipeInstructions ?? []).map(s => s.text).filter(Boolean)
    })
  } catch (err) {
    console.error('[/next_meal]', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`[BFF] Running on port ${PORT}`)
  console.log(`[BFF] Mealie: ${MEALIE_URL}`)
})
