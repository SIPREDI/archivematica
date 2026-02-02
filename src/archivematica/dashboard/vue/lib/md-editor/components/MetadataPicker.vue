<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Tree, { type TreeNode } from '@/shared/components/TreeView.vue'
import type { MetadataTreeNode } from '../composables/useFilesystemTree'

defineProps<{
  visible: boolean
  items: MetadataTreeNode[]
  loading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  close: []
  toggle: [node: MetadataTreeNode]
  add: [node: MetadataTreeNode]
  retry: [node: MetadataTreeNode]
}>()

const { t } = useI18n()
const treeRef = ref<InstanceType<typeof Tree> | null>(null)

const toMetadataNode = (node: TreeNode): MetadataTreeNode => node as MetadataTreeNode

const focusTree = () => {
  treeRef.value?.focusTree()
}

defineExpose({
  focusTree,
})
</script>

<template>
  <section
    v-show="visible"
    class="metadata-picker"
  >
    <div class="metadata-picker-header">
      <h5>{{ t('metadata.selectDirectory') }}</h5>
      <button
        type="button"
        class="close"
        :aria-label="t('metadata.close')"
        @click="emit('close')"
      >
        <i
          class="fa fa-times"
          aria-hidden="true"
        />
      </button>
    </div>

    <div
      v-if="loading"
      class="metadata-picker-status"
      role="status"
      aria-live="polite"
    >
      <i
        class="fa fa-spinner fa-spin"
        aria-hidden="true"
      />
      <span>{{ t('metadata.loading') }}</span>
    </div>

    <div
      v-else-if="error"
      class="alert alert-danger"
      role="alert"
      aria-live="assertive"
    >
      {{ error }}
    </div>

    <Tree
      v-else
      ref="treeRef"
      :items="items"
      :enter-toggles="false"
      :actions-visibility="'hover+focus'"
      :actions-focusable="false"
      :on-enter="(node) => emit('add', toMetadataNode(node))"
      @toggle="(node) => emit('toggle', toMetadataNode(node))"
    >
      <template #actions="{ node, actionProps }">
        <button
          type="button"
          class="metadata-tree-action"
          v-bind="actionProps"
          @click.stop="emit('add', toMetadataNode(node))"
        >
          {{ t('metadata.add') }}
        </button>
      </template>
      <template #children="{ node }">
        <div
          v-if="toMetadataNode(node).loadError"
          class="metadata-tree-error"
          role="alert"
          aria-live="polite"
        >
          <span>{{ toMetadataNode(node).loadError }}</span>
          <button
            type="button"
            class="btn btn-sm btn-default"
            @click.stop="emit('retry', toMetadataNode(node))"
          >
            {{ t('metadata.retry') }}
          </button>
        </div>
      </template>
    </Tree>
  </section>
</template>

<style scoped>
.metadata-picker {
  background-color: transparent;
  border: 0;
  padding: 0;
  margin-top: 10px;
  position: relative;
}

.metadata-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.metadata-picker-header h5 {
  margin: 0;
}

.metadata-picker-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.metadata-tree-action {
  border: 0;
  background: none;
  color: #337ab7;
  font-size: 12px;
  padding: 0;
  cursor: pointer;
}

.metadata-tree-action:hover,
.metadata-tree-action:focus {
  color: #23527c;
  text-decoration: underline;
}

.metadata-picker :deep(.tree-node-actions) {
  margin-left: 6px;
}

.metadata-picker :deep(.tree-node-label) {
  flex: 0 1 auto;
}

.metadata-tree-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px;
  color: #a94442;
  font-size: 12px;
}
</style>
