import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { useTopbarStatus } from '@/topbar/composables/useTopbarStatus'

vi.mock('@/topbar/composables/useTopbarStatus', () => ({
  useTopbarStatus: vi.fn(),
}))

describe('TopbarApp', () => {
  let startPolling: ReturnType<typeof vi.fn>
  let stopPolling: ReturnType<typeof vi.fn>

  beforeEach(() => {
    startPolling = vi.fn()
    stopPolling = vi.fn()
    vi.mocked(useTopbarStatus).mockReturnValue({
      startPolling: startPolling as unknown as (intervalMs?: number) => void,
      stopPolling: stopPolling as unknown as () => void,
      pollOnce: vi.fn() as unknown as () => Promise<void>,
      state: {
        counts: { sip: 0, transfer: 0, dip: 0 },
        connected: null,
        loading: false,
        error: null,
        lastUpdated: null,
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders connection status and nav counts components', async () => {
    const { default: TopbarApp } = await import('@/topbar/TopbarApp.vue')
    const wrapper = mount(TopbarApp, {
      global: {
        stubs: {
          ConnectionStatus: { template: '<div class="connection-stub"></div>' },
          NavCounts: { template: '<div class="counts-stub"></div>' },
        },
      },
    })

    expect(wrapper.find('.connection-stub').exists()).toBe(true)
    expect(wrapper.find('.counts-stub').exists()).toBe(true)
    expect(startPolling).toHaveBeenCalledTimes(1)

    wrapper.unmount()
    expect(stopPolling).toHaveBeenCalledTimes(1)
  })
})
