import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Tree from '@/shared/components/TreeView.vue'
import { h } from 'vue'

const sampleTree = [
  {
    id: 'root',
    label: 'Root',
    children: [
      { id: 'file-1', label: 'File 1' },
      {
        id: 'dir-1',
        label: 'Dir 1',
        children: [{ id: 'file-2', label: 'File 2' }],
      },
    ],
  },
]

describe('TreeView', () => {
  it('renders a root list container', () => {
    const wrapper = mount(Tree, { props: { items: sampleTree } })
    expect(wrapper.find('.tree').exists()).toBe(true)
  })

  it('renders labels for nodes', () => {
    const wrapper = mount(Tree, { props: { items: sampleTree } })
    expect(wrapper.text()).toContain('Root')
  })

  it('emits select with node payload', async () => {
    const wrapper = mount(Tree, { props: { items: sampleTree } })
    const treeNode = wrapper.findComponent({ name: 'TreeNode' })
    ;(treeNode.vm as { $emit: (event: string, payload: unknown) => void }).$emit('select', sampleTree[0])
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('select')?.[0]?.[0]).toEqual(sampleTree[0])
  })

  it('emits toggle with node payload', async () => {
    const wrapper = mount(Tree, { props: { items: sampleTree } })
    const treeNode = wrapper.findComponent({ name: 'TreeNode' })
    ;(treeNode.vm as { $emit: (event: string, payload: unknown) => void }).$emit('toggle', sampleTree[0])
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('toggle')?.[0]?.[0]).toEqual(sampleTree[0])
  })

  it('renders label and action slots when provided', () => {
    const wrapper = mount(Tree, {
      props: { items: sampleTree },
      slots: {
        label: ({ node }) => `Label:${node.label}`,
        actions: () => h('button', { class: 'action-slot' }, 'Action'),
      },
    })
    expect(wrapper.text()).toContain('Label:Root')
    expect(wrapper.find('.action-slot').exists()).toBe(true)
  })

  it('renders row container for interaction styles', () => {
    const wrapper = mount(Tree, { props: { items: sampleTree } })
    expect(wrapper.find('.tree-node-content').exists()).toBe(true)
  })
})
