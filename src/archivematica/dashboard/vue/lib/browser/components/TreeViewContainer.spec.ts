import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18nMock } from '@/shared/i18n'
import TreeViewContainer from '@/browser/components/TreeViewContainer.vue'
import TreeView from '@/shared/components/TreeView.vue'
import type { FileNode } from '@/browser/types'
import type { SourceLocation } from '@/shared/http/transfer'

const i18n = createI18nMock()

describe('TreeViewContainer', () => {
  const mockEnabledLocations: SourceLocation[] = [
    {
      uuid: 'loc1',
      description: 'Location 1',
      enabled: true,
      path: '/path1',
      purpose: 'TS',
      relative_path: '/path1',
      space: 'space1',
      used: 0,
      quota: null,
    },
    {
      uuid: 'loc2',
      description: 'Location 2',
      enabled: true,
      path: '/path2',
      purpose: 'TS',
      relative_path: '/path2',
      space: 'space2',
      used: 0,
      quota: null,
    },
  ]

  // Global config for mounting components with i18n
  const global = {
    mocks: {
      $t: (key: string, params?: Record<string, string>) => {
        const translations: Record<string, string> = {
          'fileBrowser.browser': 'File browser',
          'fileBrowser.addToTransfer': `Add ${params?.path || ''} to transfer`,
          'fileBrowser.selectFileOrFolder': 'Select a file or folder to add',
        }
        return translations[key] || key
      },
    },
  }

  const mockFileNodes: FileNode[] = [
    {
      name: 'folder1',
      path: '/folder1',
      type: 'directory',
      size: 0,
      children: [],
      children_fetched: false,
    },
    {
      name: 'file1.txt',
      path: '/file1.txt',
      type: 'file',
      size: 1024,
      children: [],
      children_fetched: false,
    },
  ]

  const defaultProps = {
    currentLocation: '',
    enabledLocations: mockEnabledLocations,
    loading: false,
    apiError: null,
    fileNodes: [],
    transferType: 'standard',
    expandedPaths: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders location selector with enabled locations', () => {
    const wrapper = mount(TreeViewContainer, {
      global: {
        ...global,
        plugins: [i18n],
      },
      props: defaultProps,
    })

    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)

    const options = select.findAll('option')
    expect(options).toHaveLength(2) // 2 locations (no placeholder)
    const firstOption = options[0]
    const secondOption = options[1]
    if (!firstOption || !secondOption) {
      throw new Error('Expected two location options')
    }
    expect(firstOption.text()).toBe('Location 1')
    expect(secondOption.text()).toBe('Location 2')
  })

  it('emits update:currentLocation when location is selected', async () => {
    const wrapper = mount(TreeViewContainer, {
      global: {
        ...global,
        plugins: [i18n],
      },
      props: defaultProps,
    })

    const select = wrapper.find('select')
    await select.setValue('loc1')

    const updateEvents = wrapper.emitted('update:currentLocation') ?? []
    const firstUpdate = updateEvents[0]
    if (!firstUpdate) {
      throw new Error('Expected update:currentLocation event payload')
    }
    expect(firstUpdate).toEqual(['loc1'])
  })

  it('accepts loading prop without displaying loading indicators', () => {
    // Note: Loading spinners were removed per user request
    // The loading prop is still accepted for API compatibility but not displayed
    const wrapper = mount(TreeViewContainer, {
      global: {
        ...global,
        plugins: [i18n],
      },
      props: {
        ...defaultProps,
        currentLocation: 'loc1',
        loading: true,
      },
    })

    // Component should render normally without loading indicators
    expect(wrapper.find('.fa-spinner').exists()).toBe(false)
    expect(wrapper.find('.transfer-tree-container').exists()).toBe(true)
  })

  it('shows error message when apiError is provided', () => {
    const errorMessage = 'Failed to load files'
    const wrapper = mount(TreeViewContainer, {
      global: {
        ...global,
        plugins: [i18n],
      },
      props: {
        ...defaultProps,
        currentLocation: 'loc1',
        apiError: errorMessage,
      },
    })

    const alert = wrapper.find('.alert-danger')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toBe(errorMessage)
  })

  it('renders TreeView when location is selected and data is loaded', () => {
    const wrapper = mount(TreeViewContainer, {
      global: {
        ...global,
        plugins: [i18n],
      },
      props: {
        ...defaultProps,
        currentLocation: 'loc1',
        fileNodes: mockFileNodes,
      },
    })

    const treeView = wrapper.findComponent(TreeView)
    expect(treeView.exists()).toBe(true)
    expect(treeView.props('items')).toEqual(mockFileNodes)
    expect(treeView.props('expanded')).toEqual([])
  })

  it('emits expand event when tree node is expanded', async () => {
    const wrapper = mount(TreeViewContainer, {
      global: {
        ...global,
        plugins: [i18n],
      },
      props: {
        ...defaultProps,
        currentLocation: 'loc1',
        fileNodes: mockFileNodes,
      },
    })

    const treeView = wrapper.findComponent(TreeView)
    const firstFileNode = mockFileNodes[0]
    if (!firstFileNode) {
      throw new Error('Expected at least one file node')
    }
    treeView.vm.$emit('toggle', firstFileNode)

    const expandEvents = wrapper.emitted('expand') ?? []
    const firstExpand = expandEvents[0]
    if (!firstExpand) {
      throw new Error('Expected expand event payload')
    }
    expect(firstExpand).toEqual([firstFileNode])
    expect(wrapper.emitted('toggle')).toEqual([[firstFileNode.path]])
  })

  it('emits add event when Add action is clicked', async () => {
    const wrapper = mount(TreeViewContainer, {
      global: {
        ...global,
        plugins: [i18n],
      },
      props: {
        ...defaultProps,
        currentLocation: 'loc1',
        fileNodes: mockFileNodes,
      },
    })

    const addButton = wrapper.find('button.transfer-tree-action')
    expect(addButton.exists()).toBe(true)
    await addButton.trigger('click')

    const addEvents = wrapper.emitted('add') ?? []
    const firstAdd = addEvents[0]
    if (!firstAdd) {
      throw new Error('Expected add event payload')
    }
    expect(firstAdd[0]).toEqual(mockFileNodes[0])
  })

  it('emits add event on Enter key select', async () => {
    const wrapper = mount(TreeViewContainer, {
      global: {
        ...global,
        plugins: [i18n],
      },
      props: {
        ...defaultProps,
        currentLocation: 'loc1',
        fileNodes: mockFileNodes,
      },
    })

    const treeView = wrapper.findComponent(TreeView)
    const firstNode = mockFileNodes[0]
    if (!firstNode) {
      throw new Error('Expected at least one file node')
    }

    const onEnter = treeView.props('onEnter') as ((node: FileNode) => void) | undefined
    if (!onEnter) {
      throw new Error('Expected onEnter handler')
    }
    onEnter(firstNode)

    const addEvents = wrapper.emitted('add') ?? []
    const firstAdd = addEvents[0]
    if (!firstAdd) {
      throw new Error('Expected add event payload')
    }
    expect(firstAdd[0]).toEqual(firstNode)
  })

  it('does not show tree container when no location is selected', () => {
    const wrapper = mount(TreeViewContainer, {
      global: {
        ...global,
        plugins: [i18n],
      },
      props: defaultProps,
    })

    expect(wrapper.find('.transfer-tree-container').exists()).toBe(false)
  })

  describe('WCAG Compliance', () => {
    it('should have proper location selector labeling', () => {
      const wrapper = mount(TreeViewContainer, {
        global: {
          ...global,
          plugins: [i18n],
        },
        props: defaultProps,
      })

      const select = wrapper.find('#source-location-select')
      expect(select.exists()).toBe(true)
      expect(select.attributes('aria-describedby')).toBe('location-help')

      const label = wrapper.find('label[for="source-location-select"]')
      expect(label.exists()).toBe(true)
      expect(label.classes()).toContain('sr-only')

      const helpText = wrapper.find('#location-help')
      expect(helpText.exists()).toBe(true)
      expect(helpText.classes()).toContain('sr-only')
    })

    it('should have proper tree container ARIA attributes', () => {
      const wrapper = mount(TreeViewContainer, {
        global: {
          ...global,
          plugins: [i18n],
        },
        props: {
          ...defaultProps,
          currentLocation: 'loc1',
          fileNodes: mockFileNodes,
        },
      })

      const treeContainer = wrapper.find('.transfer-tree-container')
      expect(treeContainer.attributes('role')).toBe('region')
      expect(treeContainer.attributes('aria-label')).toBe('File browser')
      expect(treeContainer.attributes('aria-busy')).toBe('false')

      // The tree role is now on the TreeView component, not the container
      const treeView = wrapper.findComponent(TreeView)
      expect(treeView.exists()).toBe(true)
    })

    it('should have accessible error states', () => {
      const errorMessage = 'Failed to load files'
      const wrapper = mount(TreeViewContainer, {
        global: {
          ...global,
          plugins: [i18n],
        },
        props: {
          ...defaultProps,
          currentLocation: 'loc1',
          apiError: errorMessage,
        },
      })

      const alert = wrapper.find('.alert-danger')
      expect(alert.attributes('role')).toBe('alert')
      expect(alert.attributes('aria-live')).toBe('assertive')
      expect(alert.text()).toBe(errorMessage)
    })

    it('should have accessible add action', () => {
      const wrapper = mount(TreeViewContainer, {
        global: {
          ...global,
          plugins: [i18n],
        },
        props: {
          ...defaultProps,
          currentLocation: 'loc1',
          fileNodes: mockFileNodes,
        },
      })

      const addButton = wrapper.find('.transfer-tree-action')
      expect(addButton.attributes('type')).toBe('button')
      expect(addButton.attributes('aria-label')).toBe('Add /folder1 to transfer')
    })

    it('should update aria-busy when loading', () => {
      const wrapper = mount(TreeViewContainer, {
        global: {
          ...global,
          plugins: [i18n],
        },
        props: {
          ...defaultProps,
          currentLocation: 'loc1',
          loading: true,
        },
      })

      const treeContainer = wrapper.find('.transfer-tree-container')
      expect(treeContainer.attributes('aria-busy')).toBe('true')
    })
  })
})
