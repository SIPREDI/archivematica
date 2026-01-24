<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import ConnectionStatus from '@/topbar/components/ConnectionStatus.vue'
import NavCounts from '@/topbar/components/NavCounts.vue'
import { useTopbarStatus } from '@/topbar/composables/useTopbarStatus'

const { startPolling, stopPolling } = useTopbarStatus()

onMounted(() => {
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <ConnectionStatus />
  <NavCounts />
</template>
