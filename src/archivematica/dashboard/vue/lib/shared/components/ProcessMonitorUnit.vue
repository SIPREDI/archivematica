<script setup lang="ts">
import { formatDateTime } from '@/shared/date'
import type { ProcessingJob, ProcessingUnit } from '@/shared/http/processing'
import {
  getStatusIconForJob,
  isIngestStartTimeMarkerJob,
} from '@/shared/workflow'
import ProcessMonitorGroup from './ProcessMonitorGroup.vue'
import { useI18n } from 'vue-i18n'

type JobGroup = {
  name: string
  jobs: ProcessingJob[]
}

defineProps<{
  unit: ProcessingUnit
  isExpanded: boolean
  unitGroups: JobGroup[]
  expandedGroupKeys: Record<string, boolean>
  executingChoiceJobUuids: Record<string, boolean>
  selectedChoicesByJobUuid: Record<string, string>
  microservicesHelp: Record<string, string>
  jobStatuses: Record<string, string>
}>()

const emit = defineEmits<{
  (event: 'toggle-unit', unit: ProcessingUnit): void
  (event: 'open-panel', unitUuid: string): void
  (event: 'remove-unit', unit: ProcessingUnit): void
  (event: 'toggle-group', payload: { unitUuid: string, groupName: string, jobs: ProcessingJob[] }): void
  (event: 'show-tasks', jobUuid: string): void
  (event: 'set-selected-job-choice', payload: { jobUuid: string, choice: string }): void
  (event: 'execute-job-choice', payload: { job: ProcessingJob, choice: string, unitUuid: string }): void
}>()

const { t } = useI18n()

const getStatusIcon = (job: ProcessingJob | undefined): string => {
  if (!job) return '/media/images/accept.png'
  const file = getStatusIconForJob({
    currentstep: job.currentstep,
    jobType: job.type,
    microserviceGroup: job.microservicegroup,
  })
  return `/media/images/${file}`
}

const getIngestStartTime = (unit: ProcessingUnit): string => {
  const jobs = Array.isArray(unit.jobs) ? unit.jobs : []
  const startJob
    = jobs.find(job => isIngestStartTimeMarkerJob(job.type))
      ?? (jobs.length > 0 ? jobs[jobs.length - 1] : undefined)
  if (!startJob) return ''
  return formatDateTime(startJob.timestamp)
}
</script>

<template>
  <div
    class="sip"
    :class="{ 'sip-selected': isExpanded }"
    :style="{ marginBottom: isExpanded ? '10px' : '0px' }"
  >
    <div
      :id="`sip-row-${unit.uuid}`"
      class="sip-row"
    >
      <div class="sip-detail-icon-status">
        <img
          :src="getStatusIcon(unit.jobs[0])"
          alt=""
          aria-hidden="true"
        >
      </div>
      <div
        class="sip-detail-directory"
        @click.stop.prevent="emit('toggle-unit', unit)"
      >
        {{ unit.directory }}
        <abbr :title="unit.uuid">{{ t('monitor.uuid') }}</abbr>
      </div>
      <div
        class="sip-detail-uuid"
        @click.stop.prevent="emit('toggle-unit', unit)"
      >
        {{ unit.uuid }}
      </div>
      <div
        class="sip-detail-timestamp"
        @click.stop.prevent="emit('toggle-unit', unit)"
      >
        {{ getIngestStartTime(unit) }}
      </div>
      <div class="sip-detail-actions">
        <a
          class="btn_show_metadata"
          href="#"
          :title="t('monitor.metadata')"
          @click.stop.prevent="emit('open-panel', unit.uuid)"
        ><span>{{ t('monitor.metadata') }}</span></a>
        <a
          class="btn_remove_sip"
          href="#"
          :title="t('monitor.remove')"
          @click.stop.prevent="emit('remove-unit', unit)"
        ><span>{{ t('monitor.remove') }}</span></a>
      </div>
    </div>
    <Transition name="sip-jobs-slide">
      <div
        v-if="isExpanded"
        class="sip-detail-job-container"
        :class="{ 'sip-detail-job-container-expanded': isExpanded }"
      >
        <ProcessMonitorGroup
          v-for="group in unitGroups"
          :key="group.name"
          :unit-uuid="unit.uuid"
          :group="group"
          :expanded-group-keys="expandedGroupKeys"
          :executing-choice-job-uuids="executingChoiceJobUuids"
          :selected-choices-by-job-uuid="selectedChoicesByJobUuid"
          :microservices-help="microservicesHelp"
          :job-statuses="jobStatuses"
          @toggle-group="emit('toggle-group', $event)"
          @show-tasks="emit('show-tasks', $event)"
          @set-selected-job-choice="emit('set-selected-job-choice', $event)"
          @execute-job-choice="emit('execute-job-choice', $event)"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.sip-jobs-slide-enter-active,
.sip-jobs-slide-leave-active {
  transition: max-height 0.25s ease;
  overflow: hidden;
}

.sip-detail-job-container-expanded {
  display: block;
}

.sip-jobs-slide-enter-from,
.sip-jobs-slide-leave-to {
  max-height: 0;
}

.sip-jobs-slide-enter-to,
.sip-jobs-slide-leave-from {
  max-height: 1000px;
}
</style>
