import { createApp } from 'vue'
import App from './App.vue'
import { i18n, initI18n } from '@/shared/i18n'

async function bootstrap() {
  const mountEl = document.getElementById('ingest-monitor')
  if (!mountEl) {
    throw new Error('Mount element #ingest-monitor not found.')
  }
  await initI18n()
  createApp(App).use(i18n).mount(mountEl)
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap app:', err)
})
