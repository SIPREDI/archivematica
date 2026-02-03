<script setup lang="ts">
import { ProcessMonitor } from '@/shared/components'
import { useI18n } from 'vue-i18n'
import type { MonitorConfig } from '@/shared/composables'

const { t } = useI18n()

defineProps<{
  config: MonitorConfig
}>()
</script>

<template>
  <ProcessMonitor
    unit-type="SIP"
    :config="config"
  >
    <template #header="{ removeAll }">
      <div id="sip-header-directory">
        {{ t('monitor.submissionInformationPackage') }}
      </div>
      <div id="sip-header-uuid">
        {{ t('monitor.uuid') }}
      </div>
      <div id="sip-header-timestamp">
        {{ t('monitor.ingestStartTime') }}
      </div>
      <div id="sip-header-actions">
        <a
          class="btn_remove_all_sips"
          href="#"
          :title="t('monitor.removeAllCompleted')"
          @click.prevent="removeAll()"
        ><span>&nbsp;</span></a>
      </div>
    </template>
  </ProcessMonitor>
</template>
