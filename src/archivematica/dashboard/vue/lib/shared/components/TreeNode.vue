<script setup lang="ts">
import { TreeItem, injectTreeRootContext } from 'reka-ui'
import { computed, nextTick, ref } from 'vue'
import type { PropType } from 'vue'
import type { TreeItemSelectEvent } from 'reka-ui'
import type { TreeNode, TreeNodeContext } from '@/shared/components/TreeView.vue'

defineOptions({ name: 'TreeNode' })

const props = defineProps({
  node: {
    type: Object as PropType<TreeNode>,
    required: true,
  },
  level: {
    type: Number,
    required: true,
  },
  getChildren: {
    type: Function as PropType<(node: TreeNode) => TreeNode[] | undefined>,
    required: false,
    default: undefined,
  },
  getNodeId: {
    type: Function as PropType<(node: TreeNode) => string>,
    required: false,
    default: undefined,
  },
  getAriaLabel: {
    type: Function as PropType<(node: TreeNode, context: TreeNodeContext) => string>,
    required: false,
    default: undefined,
  },
  getDisabled: {
    type: Function as PropType<(node: TreeNode) => boolean>,
    required: false,
    default: undefined,
  },
  getContentClass: {
    type: Function as PropType<(node: TreeNode, context: TreeNodeContext) => string | string[] | Record<string, boolean>>,
    required: false,
    default: undefined,
  },
  enterToggles: {
    type: Boolean,
    required: false,
    default: true,
  },
  onEnter: {
    type: Function as PropType<(node: TreeNode) => void>,
    required: false,
    default: undefined,
  },
  rightToggles: {
    type: Boolean,
    required: false,
    default: false,
  },
  actionsFocusable: {
    type: Boolean,
    required: false,
    default: true,
  },
  position: {
    type: Number,
    required: false,
    default: undefined,
  },
  totalSiblings: {
    type: Number,
    required: false,
    default: undefined,
  },
})

const emit = defineEmits<{
  select: [node: TreeNode, originalEvent?: Event]
  toggle: [node: TreeNode]
}>()

type TreeNodeSlotProps = {
  node: TreeNode
  isExpanded: boolean
  isSelected: boolean
  isDisabled: boolean
  isFocused: boolean
  actionProps?: {
    tabindex?: number
  }
}

defineSlots<{
  icon?: (props: TreeNodeSlotProps) => unknown
  label?: (props: TreeNodeSlotProps) => unknown
  actions?: (props: TreeNodeSlotProps) => unknown
  children?: (props: TreeNodeSlotProps) => unknown
}>()

const children = computed(() => (props.getChildren ? props.getChildren(props.node) : props.node.children))
const nodeId = computed(() => (props.getNodeId ? props.getNodeId(props.node) : undefined))
const isDisabled = computed(() => (props.getDisabled ? props.getDisabled(props.node) : false))
const isFocused = ref(false)
const treeContext = injectTreeRootContext()
const actionProps = computed(() => (props.actionsFocusable ? {} : { tabindex: -1 }))

const getContext = (isExpanded: boolean, isSelected: boolean): TreeNodeContext => ({
  node: props.node,
  isExpanded,
  isSelected,
  isDisabled: isDisabled.value,
})

const resolveAriaLabel = (isExpanded: boolean, isSelected: boolean) => (
  props.getAriaLabel ? props.getAriaLabel(props.node, getContext(isExpanded, isSelected)) : undefined
)

const resolveContentClass = (isExpanded: boolean, isSelected: boolean) => (
  props.getContentClass ? props.getContentClass(props.node, getContext(isExpanded, isSelected)) : undefined
)

const handleSelect = (event: TreeItemSelectEvent<TreeNode>) => {
  const originalEvent = event?.detail?.originalEvent
  emit('select', props.node, originalEvent)

  if (originalEvent instanceof KeyboardEvent && props.enterToggles) {
    const key = originalEvent.key
    if ((key === 'Enter' || key === ' ') && children.value !== undefined) {
      emit('toggle', props.node)
    }
  }
}

const handleToggleEvent = () => {
  if (!children.value) {
    return
  }
  emit('toggle', props.node)
}

const handleRightKey = (event: KeyboardEvent) => {
  if (!children.value) {
    return
  }
  event.stopImmediatePropagation()
  emit('toggle', props.node)
  treeContext?.onToggle(props.node)
}

const focusParentNode = (currentEl: HTMLElement) => {
  const root = currentEl.closest('[role="tree"]') ?? currentEl.parentElement
  if (!root || props.level <= 1) {
    currentEl.focus()
    return
  }
  const items = Array.from(root.querySelectorAll<HTMLElement>('[role="treeitem"]'))
  const index = items.indexOf(currentEl)
  if (index <= 0) {
    currentEl.focus()
    return
  }
  const targetIndent = String(props.level - 1)
  for (let i = index - 1; i >= 0; i -= 1) {
    if (items[i]?.getAttribute('data-indent') === targetIndent) {
      items[i]?.focus()
      return
    }
  }
  currentEl.focus()
}

const isNodeExpanded = () => {
  if (!treeContext?.expanded?.value || !treeContext?.getKey) return false
  const key = treeContext.getKey(props.node)
  return treeContext.expanded.value.includes(key)
}

const handleLeftKey = (event: KeyboardEvent) => {
  const currentEl = event.currentTarget as HTMLElement | null
  if (!currentEl) return
  event.stopImmediatePropagation()
  if (children.value && isNodeExpanded()) {
    emit('toggle', props.node)
    treeContext?.onToggle(props.node)
    nextTick(() => {
      currentEl.focus()
    })
    return
  }
  focusParentNode(currentEl)
}

const handleEnterKey = (event: KeyboardEvent) => {
  emit('select', props.node, event)
  if (props.onEnter) {
    props.onEnter(props.node)
    return
  }
  if (props.enterToggles && children.value !== undefined) {
    treeContext?.onToggle(props.node)
  }
}

const handleFocusIn = () => {
  isFocused.value = true
}

const handleFocusOut = (event: FocusEvent) => {
  const currentTarget = event.currentTarget as HTMLElement | null
  const relatedTarget = event.relatedTarget as HTMLElement | null
  if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) {
    return
  }
  isFocused.value = false
}
</script>

<template>
  <TreeItem
    :id="nodeId"
    v-slot="{ isExpanded, isSelected }"
    :value="props.node"
    :level="props.level"
    class="tree-node"
    :data-disabled="isDisabled ? '' : undefined"
    :aria-disabled="isDisabled ? 'true' : undefined"
    :aria-setsize="props.totalSiblings"
    :aria-posinset="props.position"
    @select="handleSelect"
    @toggle="handleToggleEvent"
    @keydown.right.stop.prevent="props.rightToggles ? handleRightKey : undefined"
    @keydown.left.stop.prevent="handleLeftKey($event)"
    @keydown.enter.stop.prevent="handleEnterKey"
    @keydown.space.stop.prevent="handleEnterKey"
    @focusin="handleFocusIn"
    @focusout="handleFocusOut"
  >
    <div
      class="tree-node-content"
      :class="[
        { 'tree-node-file': !children },
        { 'tree-node-selected': isSelected },
        resolveContentClass(isExpanded, isSelected),
      ]"
      :aria-label="resolveAriaLabel(isExpanded, isSelected)"
    >
      <span
        class="tree-node-icon"
        aria-hidden="true"
      >
        <slot
          name="icon"
          :node="props.node"
          :is-expanded="isExpanded"
          :is-selected="isSelected"
          :is-focused="isFocused"
          :is-disabled="isDisabled"
        >
          <i
            v-if="children"
            class="fa"
            :class="isExpanded ? 'fa-folder-open' : 'fa-folder'"
          />
          <span
            v-else
            class="tree-node-icon-file"
          >
            <i class="fa fa-file tree-node-icon-default" />
          </span>
        </slot>
      </span>
      <span class="tree-node-label">
        <slot
          name="label"
          :node="props.node"
          :is-expanded="isExpanded"
          :is-selected="isSelected"
          :is-focused="isFocused"
          :is-disabled="isDisabled"
        >
          {{ props.node.label }}
        </slot>
      </span>
      <span class="tree-node-actions">
        <slot
          name="actions"
          :node="props.node"
          :is-expanded="isExpanded"
          :is-selected="isSelected"
          :is-focused="isFocused"
          :is-disabled="isDisabled"
          :action-props="actionProps"
        />
      </span>
      <span
        v-if="children"
        class="tree-node-toggle"
        aria-hidden="true"
      />
    </div>
    <ul
      v-if="children && isExpanded"
      class="tree-children"
      role="group"
    >
      <slot
        name="children"
        :node="props.node"
        :is-expanded="isExpanded"
        :is-selected="isSelected"
        :is-focused="isFocused"
        :is-disabled="isDisabled"
      />
      <TreeNode
        v-for="(child, index) in children"
        :key="props.getNodeId ? props.getNodeId(child) : (child.id ?? child.path ?? String(index))"
        :node="child"
        :level="props.level + 1"
        :position="index + 1"
        :total-siblings="children.length"
        :get-children="props.getChildren"
        :get-node-id="props.getNodeId"
        :get-aria-label="props.getAriaLabel"
        :get-disabled="props.getDisabled"
        :get-content-class="props.getContentClass"
        :enter-toggles="props.enterToggles"
        :right-toggles="props.rightToggles"
        :on-enter="props.onEnter"
        @select="emit('select', $event)"
        @toggle="emit('toggle', $event)"
      >
        <template #icon="slotContext">
          <slot
            name="icon"
            v-bind="slotContext"
          />
        </template>
        <template #label="slotContext">
          <slot
            name="label"
            v-bind="slotContext"
          >
            {{ slotContext.node.label ?? '' }}
          </slot>
        </template>
        <template #actions="slotContext">
          <slot
            name="actions"
            v-bind="slotContext"
          />
        </template>
      </TreeNode>
    </ul>
  </TreeItem>
</template>
