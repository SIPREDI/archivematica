<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import TreeView from '@/shared/components/TreeView.vue'
import type { FileNode } from '@/browser/types'
import type { SourceLocation } from '@/shared/http/transfer'
import type { TreeNode, TreeNodeContext } from '@/shared/components/TreeView.vue'

const { t } = useI18n()

const treeViewRef = ref<InstanceType<typeof TreeView>>()

// Expose method to focus the tree view for external callers.
const focusTreeView = () => {
  if (treeViewRef.value) {
    treeViewRef.value.focusTree()
  }
}

defineExpose({
  focusTreeView,
})

const props = defineProps<{
  currentLocation: string
  enabledLocations: SourceLocation[]
  loading: boolean
  apiError: string | null
  fileNodes: FileNode[]
  transferType: string
  expandedPaths: string[]
}>()

const emit = defineEmits<{
  'update:currentLocation': [value: string]
  'expand': [node: FileNode]
  'toggle': [path: string]
  'add': [node: FileNode]
}>()

const toFileNode = (node: TreeNode): FileNode => node as FileNode

const COMPRESSED_EXTENSIONS = [
  '.zip',
  '.tgz',
  '.tar.gz',
  '.tar.bz2',
  '.tar.xz',
  '.7z',
  '.rar',
  '.gz',
  '.bz2',
] as const

const isCompressedFile = (node: TreeNode): boolean => {
  const name = toFileNode(node).name.toLowerCase()
  return COMPRESSED_EXTENSIONS.some(ext => name.endsWith(ext))
}

const isNodeAddable = (node: TreeNode, transferType: string): boolean => {
  const fileNode = toFileNode(node)
  const isDir = fileNode.type === 'directory'

  switch (transferType) {
    case 'zipped bag':
    case 'zipfile':
      return !isDir && isCompressedFile(fileNode)
    case 'dspace':
      return isDir || (!isDir && isCompressedFile(fileNode))
    case 'standard':
    case 'unzipped bag':
    case 'disk image':
    case 'dataverse':
    default:
      return isDir
  }
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`
  return `${Math.round(bytes / (1024 * 1024 * 1024))} GB`
}

const buildAriaLabel = (node: TreeNode, context: TreeNodeContext, transferType: string): string => {
  const fileNode = toFileNode(node)
  let label = fileNode.name

  if (!isNodeAddable(fileNode, transferType)) {
    label += ` (${t('fileBrowser.notSelectableFor', { type: transferType })})`
  }

  if (fileNode.display_string) {
    label += ` (${fileNode.display_string})`
  } else if (fileNode.size && fileNode.type !== 'directory') {
    label += ` (${formatSize(fileNode.size)})`
  }

  if (fileNode.type === 'directory') {
    label += context.isExpanded ? ` (${t('fileBrowser.expanded')})` : ` (${t('fileBrowser.collapsed')})`
    if (fileNode.children && fileNode.children_fetched) {
      label += ` containing ${fileNode.children.length} items`
    }
  }

  return label
}

const handleLocationSelect = (event: Event) => {
  const target = event.target as HTMLSelectElement | null
  if (target) {
    emit('update:currentLocation', target.value)
  }
}

const handleToggle = (node: TreeNode) => {
  const fileNode = toFileNode(node)
  emit('toggle', fileNode.path)
  if (fileNode.type === 'directory' && !fileNode.children_fetched) {
    emit('expand', fileNode)
  }
}
</script>

<template>
  <div id="transfer-browse-tree">
    <!-- Source Location Selector -->
    <label
      for="source-location-select"
      class="sr-only"
    >{{ t('fileBrowser.sourceLocation') }}</label>
    <select
      id="source-location-select"
      class="form-control"
      :value="currentLocation"
      aria-describedby="location-help"
      @change="handleLocationSelect"
    >
      <option
        v-for="location in enabledLocations"
        :key="location.uuid"
        :value="location.uuid"
      >
        {{ location.description }}
      </option>
    </select>
    <span
      id="location-help"
      class="sr-only"
    >{{ t('fileBrowser.locationHelp') }}</span>

    <!-- Tree Container -->
    <div
      v-if="currentLocation"
      class="well well-sm transfer-tree-container"
      role="region"
      :aria-label="t('fileBrowser.browser')"
      :aria-busy="loading"
    >
      <div
        v-if="apiError"
        class="alert alert-danger"
        role="alert"
        aria-live="assertive"
      >
        {{ apiError }}
      </div>
      <TreeView
        v-else
        ref="treeViewRef"
        :items="props.fileNodes"
        :root-class="'tree-transfer'"
        :get-key="(node) => toFileNode(node).path"
        :get-children="(node) => toFileNode(node).children"
        :expanded="props.expandedPaths"
        :get-disabled="(node) => !isNodeAddable(node, transferType)"
        :get-aria-label="(node, ctx) => buildAriaLabel(node, ctx, transferType)"
        :get-content-class="(node) => ({
          'tree-node-selectable': isNodeAddable(node, transferType),
        })"
        :scroll-container-selector="'.transfer-tree-container'"
        :scroll-on-select="true"
        :enter-toggles="false"
        :right-toggles="true"
        :actions-visibility="'hover+focus'"
        :actions-focusable="false"
        :on-enter="(node) => {
          if (isNodeAddable(node, transferType)) {
            $emit('add', toFileNode(node))
          }
        }"
        @toggle="handleToggle($event)"
      >
        <template #label="{ node, isExpanded }">
          <span class="tree-node-label">{{ toFileNode(node).name }}</span>
          <span
            v-if="toFileNode(node).display_string"
            class="tree-node-display"
          >({{ toFileNode(node).display_string }})</span>
          <span
            v-else-if="toFileNode(node).size && toFileNode(node).type !== 'directory'"
            class="tree-node-size"
          >({{ formatSize(toFileNode(node).size ?? 0) }})</span>
          <span
            v-if="!isNodeAddable(node, transferType)"
            class="sr-only"
          >({{ t('fileBrowser.notSelectableFor', { type: transferType }) }})</span>
          <span
            v-if="toFileNode(node).type === 'directory'"
            class="sr-only"
          >
            {{ isExpanded ? `(${t('fileBrowser.expanded')})` : `(${t('fileBrowser.collapsed')})` }}
          </span>
        </template>
        <template #actions="{ node, actionProps }">
          <button
            v-if="isNodeAddable(node, transferType)"
            type="button"
            class="transfer-tree-action"
            :aria-label="t('fileBrowser.addToTransfer', { path: toFileNode(node).path })"
            v-bind="actionProps"
            @click.stop="$emit('add', toFileNode(node))"
          >
            {{ t('transfer.add') }}
          </button>
        </template>
        <template #children="{ node }">
          <div
            v-if="toFileNode(node).type === 'directory' && toFileNode(node).loading"
            class="tree-node-loading"
            role="status"
            aria-live="polite"
          >
            {{ t('transfer.loading') }}
          </div>
          <div
            v-else-if="toFileNode(node).type === 'directory' && toFileNode(node).children_fetched && (toFileNode(node).children?.length ?? 0) === 0"
            class="tree-node-empty"
            role="status"
          >
            {{ t('fileBrowser.emptyFolder') }}
          </div>
        </template>
      </TreeView>
    </div>
  </div>
</template>

<style scoped>
#transfer-browse-tree {
  width: 950px;
  margin-bottom: 60px;
  margin-top: 10px;
}

.transfer-tree-container {
  margin-top: 10px;
  margin-bottom: 10px;
  overflow: auto;
  max-height: 30em;
}

.transfer-tree-action {
  border: 0;
  background: none;
  color: #337ab7;
  font-size: 12px;
  padding: 0;
  cursor: pointer;
}

.transfer-tree-action:hover,
.transfer-tree-action:focus {
  color: #23527c;
  text-decoration: underline;
}

:deep(.transfer-tree-container .tree-node-actions) {
  margin-left: 6px !important;
  display: inline-flex;
}

:deep(.transfer-tree-container .tree-node-label) {
  flex: 0 1 auto;
}

/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Ensure focus indicators are visible */
select:focus,
button:focus {
  outline: 2px solid #007cba;
  outline-offset: 2px;
}
</style>
