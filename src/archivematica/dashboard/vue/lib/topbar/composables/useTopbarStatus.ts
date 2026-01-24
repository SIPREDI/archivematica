import { reactive, readonly } from 'vue'
import { getStatus, HttpError } from '@/shared/http'

type StatusCounts = {
  sip: number
  transfer: number
  dip: number
}

type StatusState = {
  counts: StatusCounts
  connected: boolean | null
  loading: boolean
  error: string | null
  lastUpdated: number | null
}

const state = reactive<StatusState>({
  counts: { sip: 0, transfer: 0, dip: 0 },
  connected: null,
  loading: false,
  error: null,
  lastUpdated: null,
})

let pollHandle: number | null = null
let activeSubscribers = 0
let inFlight = false
let loadingTimer: number | null = null
const LOADING_DELAY_MS = 150

const normalizeCount = (value: unknown): number => {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const pollOnce = async (): Promise<void> => {
  if (inFlight) return
  inFlight = true
  if (loadingTimer !== null) {
    window.clearTimeout(loadingTimer)
  }
  loadingTimer = window.setTimeout(() => {
    state.loading = true
  }, LOADING_DELAY_MS)

  try {
    const data = await getStatus()
    state.counts = {
      sip: normalizeCount(data?.sip),
      transfer: normalizeCount(data?.transfer),
      dip: normalizeCount(data?.dip),
    }
    state.connected = true
    state.error = null
    state.lastUpdated = Date.now()
  } catch (error) {
    state.connected = false
    if (error instanceof HttpError) {
      state.error = `Status request failed: ${error.status}`
    } else {
      state.error = error instanceof Error ? error.message : 'Status request failed'
    }
  } finally {
    if (loadingTimer !== null) {
      window.clearTimeout(loadingTimer)
      loadingTimer = null
    }
    state.loading = false
    inFlight = false
  }
}

const startPolling = (intervalMs = 5000): void => {
  activeSubscribers += 1
  if (pollHandle !== null) return

  pollOnce()
  pollHandle = window.setInterval(pollOnce, intervalMs)
}

const stopPolling = (): void => {
  activeSubscribers = Math.max(0, activeSubscribers - 1)
  if (activeSubscribers > 0) return
  if (pollHandle === null) return

  window.clearInterval(pollHandle)
  pollHandle = null
}

export function useTopbarStatus() {
  return {
    state: readonly(state),
    pollOnce,
    startPolling,
    stopPolling,
  }
}
