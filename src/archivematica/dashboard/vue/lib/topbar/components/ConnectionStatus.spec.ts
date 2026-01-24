import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18nMock } from '@/shared/i18n'
import { useTopbarStatus } from '@/topbar/composables/useTopbarStatus'

const i18n = createI18nMock()
const baseState = {
  counts: { sip: 0, transfer: 0, dip: 0 },
  connected: true,
  loading: false,
  error: null,
  lastUpdated: null,
} as const

vi.mock('@/topbar/composables/useTopbarStatus', () => ({
  useTopbarStatus: vi.fn(),
}))

describe('ConnectionStatus', () => {
  beforeEach(() => {
    vi.mocked(useTopbarStatus).mockReturnValue({
      state: baseState,
      pollOnce: vi.fn() as unknown as () => Promise<void>,
      startPolling: vi.fn() as unknown as (intervalMs?: number) => void,
      stopPolling: vi.fn() as unknown as () => void,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('renders status bullet in connection target', async () => {
    const target = document.createElement('div')
    target.id = 'connection-status'
    document.body.appendChild(target)

    const { default: ConnectionStatus } = await import('@/topbar/components/ConnectionStatus.vue')

    const wrapper = mount(ConnectionStatus, {
      global: {
        plugins: [i18n],
      },
    })

    await wrapper.vm.$nextTick()
    expect(target.querySelector('#status-bullet')).not.toBeNull()

    wrapper.unmount()
  })

  it('does not render when target is missing', async () => {
    const { default: ConnectionStatus } = await import('@/topbar/components/ConnectionStatus.vue')

    const wrapper = mount(ConnectionStatus, {
      global: {
        plugins: [i18n],
      },
    })

    await wrapper.vm.$nextTick()
    expect(document.querySelector('#status-bullet')).toBeNull()

    wrapper.unmount()
  })
})
