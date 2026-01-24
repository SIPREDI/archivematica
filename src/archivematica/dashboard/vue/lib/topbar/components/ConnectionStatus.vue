<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTopbarStatus } from '@/topbar/composables/useTopbarStatus'

const { t } = useI18n()
const { state } = useTopbarStatus()

const hasTarget = ref(false)

const connectionText = computed(() => {
  if (state.loading) {
    return t('topbar.loading')
  }
  if (state.connected === null) {
    return t('topbar.initializing')
  }
  if (state.connected) {
    return t('topbar.connected')
  }
  return t('topbar.disconnected')
})

const connectionIcon = computed(() => {
  if (state.loading) {
    return '/media/images/bullet_orange.png'
  }
  if (state.connected === null) {
    return '/media/images/bullet_delete.png'
  }
  if (state.connected) {
    return '/media/images/bullet_green.png'
  }
  return '/media/images/bullet_delete.png'
})

const connectionTitle = computed(() => {
  if (state.loading) {
    return t('topbar.loading')
  }
  if (state.connected === null) {
    return t('topbar.initializing')
  }
  if (state.connected) {
    return t('topbar.connected')
  }
  return t('topbar.disconnected')
})

onMounted(() => {
  hasTarget.value = Boolean(document.querySelector('#connection-status'))
})
</script>

<template>
  <Teleport v-if="hasTarget" to="#connection-status">
    <div id="status-bullet">
      <span>{{ connectionText }}</span>
      <img :src="connectionIcon" :title="connectionTitle" />
    </div>
  </Teleport>
</template>
