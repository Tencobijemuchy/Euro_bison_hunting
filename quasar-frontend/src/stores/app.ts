import { defineStore } from 'pinia'
import { useUserStore } from './user'
import { watch } from 'vue'

export const useAppStore = defineStore('app', {
  state: () => ({
    status: 'online' as 'online' | 'dnd' | 'offline',
    notifMode: 'all' as 'all' | 'mentions' | 'off',
  }),
  actions: {
    init() {
      const user = useUserStore()

      watch(() => this.status, async (newStatus) => {
        await user.updateSettings(newStatus, undefined)
      })

      watch(() => this.notifMode, async (newMode) => {
        await user.updateSettings(undefined, newMode)
      })


      if (user.me) {
        this.status = user.me.status || 'online'
        this.notifMode = user.me.notifications || 'all'
      }
    },
  },
})
