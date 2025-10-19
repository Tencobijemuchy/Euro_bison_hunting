import { defineStore } from 'pinia'
export type NotificationMode = 'all' | 'mentionsOnly' | 'off'
export type UserStatus = 'online' | 'dnd' | 'offline'

export const useAppStore = defineStore('app', {
  state: () => ({
    isAppVisible: false as boolean,
    notifMode: 'all' as NotificationMode,
    status: 'online' as UserStatus
  })
})
