import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import App from './App.vue'
import { createI18nMock } from '@/shared/i18n'
import { encodeBase64 } from '@/shared/encoding/base64'

vi.mock('@/shared/http', async () => {
  const actual = await vi.importActual<typeof import('@/shared/http')>('@/shared/http')
  return {
    ...actual,
    getFilesystemChildren: vi.fn(),
    copyMetadataFiles: vi.fn(),
  }
})

import { getFilesystemChildren, copyMetadataFiles } from '@/shared/http'

describe('App', () => {
  const sourceDirectories = {
    loc1: '/home',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('getCookie', vi.fn(() => 'token'))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const mountEditor = () =>
    mount(App, {
      props: {
        sipUUID: 'sip-123',
        sourceDirectories,
      },
      global: {
        plugins: [createI18nMock()],
      },
    })

  it('renders source location options', () => {
    const wrapper = mountEditor()
    const options = wrapper.findAll('option')
    expect(options).toHaveLength(1)
    expect(options[0]?.text()).toBe('/home')
  })

  it('loads directory contents when browsing', async () => {
    vi.mocked(getFilesystemChildren).mockResolvedValue({
      entries: [],
      directories: [],
      properties: {},
    })

    const wrapper = mountEditor()
    await wrapper.get('button.btn.btn-default').trigger('click')
    await flushPromises()

    expect(getFilesystemChildren).toHaveBeenCalledWith('loc1', encodeBase64('/home'))
  })

  it('adds a selected directory and submits', async () => {
    vi.mocked(getFilesystemChildren).mockResolvedValue({
      entries: [],
      directories: [],
      properties: {},
    })
    vi.mocked(copyMetadataFiles).mockResolvedValue({})

    const wrapper = mountEditor()
    await wrapper.get('button.btn.btn-default').trigger('click')
    await flushPromises()

    const addButton = wrapper.get('button.metadata-tree-action')
    await addButton.trigger('click')

    const addedPath = wrapper.get('.path')
    expect(addedPath.text()).toBe('/home')

    await wrapper.get('button.btn.btn-success').trigger('click')

    expect(copyMetadataFiles).toHaveBeenCalledWith(
      'sip-123',
      [encodeBase64('loc1:/home/')],
    )
  })
})
