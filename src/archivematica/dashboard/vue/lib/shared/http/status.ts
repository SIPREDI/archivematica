import { createHttpClient } from '@/shared/http/client'

export type StatusResponse = {
  sip?: unknown
  transfer?: unknown
  dip?: unknown
}

const client = createHttpClient()

export const getStatus = async (): Promise<StatusResponse | null> => {
  return client.getJson<StatusResponse | null>('/status/', { cacheBust: true })
}
