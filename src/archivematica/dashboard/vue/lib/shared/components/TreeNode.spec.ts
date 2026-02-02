import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import TreeNode from './TreeNode.vue'

vi.mock('reka-ui', () => {
  const TreeItem = defineComponent({
    name: 'TreeItem',
    setup(_, { slots }) {
      return () => h('div', { class: 'tree-item', role: 'treeitem' }, slots.default?.({
        isExpanded: false,
        isSelected: false,
      }))
    },
  })

  return {
    TreeItem,
    injectTreeRootContext: () => null,
  }
})

describe('TreeNode', () => {
  it('renders a leaf node label and file icon', () => {
    const wrapper = mount(TreeNode, {
      props: {
        node: { id: 'node-1', label: 'Node 1' },
        level: 1,
      },
    })

    expect(wrapper.find('.tree-node-content').exists()).toBe(true)
    expect(wrapper.text()).toContain('Node 1')
    expect(wrapper.find('.tree-node-icon-file').exists()).toBe(true)
    expect(wrapper.find('.tree-node-toggle').exists()).toBe(false)
  })

  it('renders a branch node with folder icon and toggle placeholder', () => {
    const wrapper = mount(TreeNode, {
      props: {
        node: {
          id: 'node-2',
          label: 'Node 2',
          children: [{ id: 'child-1', label: 'Child 1' }],
        },
        level: 1,
      },
    })

    expect(wrapper.find('.fa-folder').exists()).toBe(true)
    expect(wrapper.find('.tree-node-toggle').exists()).toBe(true)
    expect(wrapper.find('.tree-children').exists()).toBe(false)
  })
})
