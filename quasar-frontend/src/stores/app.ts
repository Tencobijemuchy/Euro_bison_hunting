import { defineStore } from 'pinia'
import { useUserStore } from './user'
import { watch } from 'vue'

export const useAppStore = defineStore('app', {
  state: () => ({
    status: 'online' as 'online' | 'dnd' | 'offline',
    notifications: 'all' as 'all' | 'mentions' | 'off'
  }),
  actions: {
    init() {
      const user = useUserStore()

      // watchuj zmeny statusu
      watch(() => this.status, async (newStatus) => {
        await user.updateSettings(newStatus, undefined)
      })

      // watchuj zmeny notifikacii
      watch(() => this.notifications, async (newNotifications) => {
        await user.updateSettings(undefined, newNotifications)
      })

      // nacitaj pociatocne hodnoty z user store
      if (user.me) {
        this.status = user.me.status || 'online'
        this.notifications = user.me.notifications || 'all'
      }
    },
  },
})
