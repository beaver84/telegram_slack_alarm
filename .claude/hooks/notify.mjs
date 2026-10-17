#!/usr/bin/env node
// Claude Code hook -> Slack + Telegram notification.
// Events: Notification (permission/input request), Stop (response finished).
// Env: SLACK_WEBHOOK_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (each optional; unset channel is skipped).
// NOTIFY_DRY_RUN=1 prints the message instead of sending.
// Never blocks Claude: always exits 0.

import { basename } from 'node:path'

const TIMEOUT_MS = 5000

const readStdin = async () => {
  let data = ''
  for await (const chunk of process.stdin) data += chunk
  return data
}

const parsePayload = (raw) => {
  try {
    return raw.trim() ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const buildMessage = (payload) => {
  const project = basename(payload.cwd || process.cwd())
  const event = payload.hook_event_name || process.argv[2] || 'Unknown'
  const detail =
    event === 'Stop'
      ? '작업이 끝났습니다.'
      : payload.message || 'Claude가 입력을 기다리고 있습니다.'
  const icon = event === 'Stop' ? '✅' : '🔔'
  return `${icon} [Claude Code] ${project}\n${detail}`
}

const post = async (url, body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

const sendSlack = (text) => {
  const url = process.env.SLACK_WEBHOOK_URL
  if (!url) return null
  return post(url, { text })
}

const sendTelegram = (text) => {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return null
  return post(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: chatId,
    text,
  })
}

const main = async () => {
  const text = buildMessage(parsePayload(await readStdin()))

  if (process.env.NOTIFY_DRY_RUN === '1') {
    console.log(text)
    return
  }

  const jobs = [
    ['slack', sendSlack(text)],
    ['telegram', sendTelegram(text)],
  ].filter(([, job]) => job)

  const results = await Promise.allSettled(jobs.map(([, job]) => job))
  results.forEach((result, i) => {
    // Log failures to stderr (non-blocking: exit 0 keeps Claude running).
    if (result.status === 'rejected') {
      console.error(`notify ${jobs[i][0]} failed: ${result.reason?.message}`)
    }
  })
}

// exitCode (not process.exit) lets pending fetch handles close; process.exit crashes on Windows libuv.
main().finally(() => {
  process.exitCode = 0
})
