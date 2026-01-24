<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTopbarStatus } from '@/topbar/composables/useTopbarStatus'

const { state } = useTopbarStatus()

const transferSelector = 'ul.nav > li > a[href="/transfer/"]'
const ingestSelector = 'ul.nav > li > a[href="/ingest/"]'

const hasTransferTarget = ref(false)
const hasIngestTarget = ref(false)

const transferCount = computed(() => state.counts.transfer)
const ingestCount = computed(() => state.counts.sip + state.counts.dip)

onMounted(() => {
  hasTransferTarget.value = Boolean(document.querySelector(transferSelector))
  hasIngestTarget.value = Boolean(document.querySelector(ingestSelector))
})
</script>

<template>
  <Teleport v-if="hasTransferTarget" :to="transferSelector">
    <span v-if="transferCount > 0">{{ transferCount }}</span>
  </Teleport>

  <Teleport v-if="hasIngestTarget" :to="ingestSelector">
    <span v-if="ingestCount > 0">{{ ingestCount }}</span>
  </Teleport>
</template>
