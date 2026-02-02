<!--
TreeView.vue provides a minimal tree wrapper built on Reka UI. It is intended as a
simple, reusable foundation for the Archivematica Dashboard’s three browsing
contexts such as:
- Ingest browser. Implemented in `lib/aip-browser` and accessed from the Ingest
  tab when previewing packages.
- Metadata editor. Implemented in `lib/md-editor` for the add-metadata-files
  view in the Ingest workflow.
- Transfer browser: implemented in `lib/browser` for the Transfer tab widget
  used to choose contents and start new transfers.

Goals:
- Provide a small, stable tree surface (items + select/toggle events).
- Stay focused on presentation and interaction.
- Support gradual growth as the three use cases converge.

Non-goals:
- Owning data loading (fetching, decoding, lazy loading).
- Encoding Archivematica-specific rules (selection policy, download behavior).
- Acting as a full-featured file browser on its own.
-->
<script lang="ts">
export type TreeNode = {
  id?: string
  label?: string
  path?: string
  children?: TreeNode[]
}

export type TreeNodeContext = {
  node: TreeNode
  isExpanded: boolean
  isSelected: boolean
  isDisabled: boolean
}
</script>

<script setup lang="ts">
import { TreeRoot } from 'reka-ui'
import TreeNode from '@/shared/components/TreeNode.vue'
import { computed, nextTick, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  // The array of tree nodes to display in the tree.
  items: TreeNode[]

  // The currently selected tree node. Supports v-model for two-way binding.
  modelValue?: TreeNode

  // Array of node keys that should be expanded by default.
  // Keys are determined by the getKey function or node.id.
  expanded?: string[]

  // Whether multiple nodes can be selected simultaneously.
  // When true, modelValue can be an array (handled by Reka UI).
  multiple?: boolean

  // Function to extract a unique key from a tree node. Defaults to using
  // node.id if available.
  getKey?: (node: TreeNode) => string

  // Function to get the children of a tree node. Defaults to using
  // node.children if available.
  getChildren?: (node: TreeNode) => TreeNode[] | undefined

  // Function to generate a unique DOM ID for a tree node. Used for
  // accessibility and scrolling. Defaults to sanitizing getKey result.
  getNodeId?: (node: TreeNode) => string

  // Function to generate an ARIA label for a tree node. Receives the node and
  // its context (expanded, selected, disabled state).
  getAriaLabel?: (node: TreeNode, context: TreeNodeContext) => string

  // Function to determine if a tree node should be disabled. Disabled nodes
  // cannot be selected or toggled.
  getDisabled?: (node: TreeNode) => boolean

  // Function to get CSS classes for the tree node's content. Can return a
  // string, array of strings, or object of class mappings.
  getContentClass?: (node: TreeNode, context: TreeNodeContext) => string | string[] | Record<string, boolean>

  // CSS selector for the scrollable container. Used for auto-scrolling when
  // nodes are selected.
  scrollContainerSelector?: string

  // Whether to automatically scroll the selected node into view.
  scrollOnSelect?: boolean

  // Additional CSS class to apply to the root tree element.
  rootClass?: string

  // Whether pressing Enter key toggles node expansion.
  enterToggles?: boolean

  // Callback function when Enter is pressed on a node.
  onEnter?: (node: TreeNode) => void

  // Whether right-clicking toggles node expansion.
  rightToggles?: boolean

  // When actions (buttons/icons) in tree nodes should be visible.
  actionsVisibility?: 'always' | 'hover' | 'focus' | 'hover+focus'

  // Whether actions in tree nodes are focusable via keyboard.
  actionsFocusable?: boolean
}>(), {
  actionsVisibility: 'always',
  actionsFocusable: true,
  modelValue: undefined,
  expanded: undefined,
  getKey: undefined,
  getChildren: undefined,
  getNodeId: undefined,
  getAriaLabel: undefined,
  getDisabled: undefined,
  getContentClass: undefined,
  scrollContainerSelector: undefined,
  rootClass: undefined,
  onEnter: undefined,
})

const emit = defineEmits<{
  // Emitted when a tree node is selected.
  'select': [node: TreeNode, originalEvent?: Event]
  // Emitted when a tree node is toggled (expanded/collapsed).
  'toggle': [node: TreeNode]
  // Emitted to update the selected node for v-model binding.
  'update:modelValue': [node: TreeNode | undefined]
  // Emitted to update the expanded nodes for v-model binding.
  'update:expanded': [expanded: string[]]
}>()

// Reference to the root Tree component for focus management.
const treeRootRef = ref<{ $el?: HTMLElement } | null>(null)

// Compute CSS class for actions visibility based on prop.
const actionsVisibilityClass = computed(() => {
  switch (props.actionsVisibility) {
    case 'hover':
      return 'tree-actions-hover'
    case 'focus':
      return 'tree-actions-focus'
    case 'hover+focus':
      return 'tree-actions-hover-focus'
    default:
      return undefined
  }
})

// Get unique key for a tree node.
const getKey = (node: TreeNode | Record<string, unknown>) => {
  if (props.getKey && typeof props.getKey === 'function') {
    return props.getKey(node as TreeNode) || ''
  }
  return (node as TreeNode | undefined)?.id ?? ''
}

// Get children for a tree node.
const getChildren = (node: TreeNode | Record<string, unknown>) => {
  if (props.getChildren) {
    return props.getChildren(node as TreeNode)
  }
  return (node as TreeNode | undefined)?.children
}

// Sanitize a string to be a valid DOM ID.
const sanitizeId = (value: string) => value
  .replace(/[^A-Za-z0-9_-]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')

// Generate a fallback hash for a string.
const fallbackHash = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(16)
}

// Get or generate a unique DOM ID for a tree node.
const getNodeId = (node: TreeNode) => {
  if (props.getNodeId) {
    return props.getNodeId(node)
  }
  const key = getKey(node)
  const sanitized = sanitizeId(key)
  return sanitized ? `tree-node-${sanitized}` : `tree-node-${fallbackHash(key)}`
}

// Scroll the specified node into view within the scroll container.
const scrollToNode = (node: TreeNode) => {
  const nodeId = getNodeId(node)
  const element = nodeId ? document.getElementById(nodeId) : null
  if (!element) return
  const container = props.scrollContainerSelector
    ? element.closest(props.scrollContainerSelector)
    : element.parentElement
  if (!container) return
  const containerRect = container.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    element.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
    })
  }
}

// Handle selection of a tree node.
const handleSelect = (node: TreeNode, originalEvent?: Event) => {
  emit('select', node, originalEvent)
  if (props.scrollOnSelect) {
    nextTick(() => {
      scrollToNode(node)
    })
  }
}

// Watch for changes to the selected node and scroll into view if needed.
watch(
  () => props.modelValue,
  (node) => {
    if (!props.scrollOnSelect || !node) return
    nextTick(() => {
      scrollToNode(node)
    })
  },
)

// Expose a method to focus the tree component.
const focusTree = () => {
  const rootEl = treeRootRef.value?.$el
  if (!rootEl) return
  const selectedItem = rootEl.querySelector<HTMLElement>('[role="treeitem"][data-selected]')
  const firstItem = rootEl.querySelector<HTMLElement>('[role="treeitem"]')
  const target = selectedItem ?? firstItem
  target?.focus()
}

defineExpose({
  focusTree,
})
</script>

<template>
  <TreeRoot
    ref="treeRootRef"
    :items="props.items"
    :get-key="getKey"
    :get-children="getChildren"
    :model-value="props.modelValue"
    :expanded="props.expanded"
    :multiple="props.multiple"
    class="tree"
    :class="[props.rootClass, actionsVisibilityClass]"
    @update:model-value="emit('update:modelValue', $event as TreeNode | undefined)"
    @update:expanded="emit('update:expanded', $event)"
  >
    <TreeNode
      v-for="(item, index) in props.items"
      :key="getKey(item)"
      :node="item"
      :level="1"
      :position="index + 1"
      :total-siblings="props.items.length"
      :get-children="getChildren"
      :get-node-id="getNodeId"
      :get-aria-label="props.getAriaLabel"
      :get-disabled="props.getDisabled"
      :get-content-class="props.getContentClass"
      :enter-toggles="props.enterToggles"
      :on-enter="props.onEnter"
      :right-toggles="props.rightToggles"
      :actions-focusable="props.actionsFocusable"
      @select="handleSelect"
      @toggle="emit('toggle', $event)"
    >
      <template #icon="slotProps">
        <slot
          name="icon"
          v-bind="slotProps"
        />
      </template>
      <template #label="slotProps">
        <slot
          name="label"
          v-bind="slotProps"
        >
          {{ slotProps.node.label }}
        </slot>
      </template>
      <template #actions="slotProps">
        <slot
          name="actions"
          v-bind="slotProps"
        />
      </template>
      <template #children="slotProps">
        <slot
          name="children"
          v-bind="slotProps"
        />
      </template>
    </TreeNode>
  </TreeRoot>
</template>

<style>
.tree {
  list-style: none;
  margin: 0;
  padding-left: 0;
}

.tree-actions-hover .tree-node-actions,
.tree-actions-focus .tree-node-actions,
.tree-actions-hover-focus .tree-node-actions {
  opacity: 0;
  transition: opacity 120ms ease;
}

.tree-actions-hover .tree-node-content:hover .tree-node-actions,
.tree-actions-hover-focus .tree-node-content:hover .tree-node-actions {
  opacity: 1;
}

.tree-actions-focus .tree-node:focus > .tree-node-content .tree-node-actions,
.tree-actions-hover-focus .tree-node:focus > .tree-node-content .tree-node-actions {
  opacity: 1;
}

.tree-node-content {
  display: flex;
  align-items: center;
  padding: 6px;
  background-color: transparent;
  cursor: pointer;
  user-select: none;
  gap: 6px;
}

.tree-node {
  background-color: #fff;
}

.tree-node:focus {
  outline: none;
}

.tree-node:focus > .tree-node-content {
  outline: 2px solid #2a7ae2;
  outline-offset: 2px;
  background-color: #fff2cc;
}

.tree-node-content:hover {
  background-color: #fff2cc;
}

.tree-node-icon {
  display: block;
  width: 28px;
  height: 16px;
  text-align: center;
  flex-shrink: 0;
}

.tree-node-icon .fa-folder,
.tree-node-icon .fa-folder-open {
  color: #f1c40f;
}

.tree-node-icon .fa-file {
  color: #95a5a6;
}

.tree-node-label {
  cursor: inherit;
  flex: 1;
}

.tree-node-actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tree-node-toggle {
  width: 0;
  height: 0;
}

.tree-children {
  list-style: none;
  margin: 0;
  padding-left: 10px;
}

.tree-transfer .tree-node {
  user-select: none;
  background-color: transparent;
}

.tree-transfer .tree-node-content {
  padding: 2px 4px;
  min-height: 20px;
  line-height: 1.4;
  cursor: default;
}

.tree-transfer .tree-node-content.tree-node-selectable {
  cursor: pointer;
}

.tree-transfer .tree-node-content.tree-node-selectable:hover {
  background-color: #f5f5f5;
}

.tree-transfer .tree-node:focus > .tree-node-content.tree-node-selectable {
  background-color: #f5f5f5;
}

.tree-transfer .tree-node[data-disabled] .tree-node-content {
  opacity: 0.8;
  text-decoration: line-through;
  color: #767676;
  cursor: not-allowed;
}

.tree-transfer .tree-node[data-disabled] .tree-node-content:hover {
  background-color: transparent;
}

.tree-transfer .tree-node-toggle {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 4px;
}

.tree-transfer .tree-node-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 4px;
}

.tree-transfer .tree-node-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-transfer .tree-node-size,
.tree-transfer .tree-node-display {
  color: #595959;
  margin-left: 4px;
}

.tree-transfer .tree-node-children {
  margin-left: 20px;
}

.tree-transfer .tree-node-loading {
  padding: 2px 4px;
  color: #595959;
  font-style: italic;
  font-size: 12px;
}

.tree-transfer .tree-node-empty {
  padding: 2px 4px;
  color: #767676;
  font-style: italic;
  font-size: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .tree-transfer .tree-node-content {
    transition: none;
  }
}
</style>
