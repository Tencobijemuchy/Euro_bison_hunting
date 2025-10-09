import { defineStore } from 'pinia'

export type Channel = {
  id: number
  name: string
  isPrivate: boolean
  members: number
}

export const useChannelStore = defineStore('channels', {
  state: () => ({
    channels: [
      { id: 1, name: 'idk1', isPrivate: false, members: 12 },
      { id: 2, name: 'idk2', isPrivate: false, members: 5 },
      { id: 3, name: 'idk3', isPrivate: true, members: 3 },
      { id: 1, name: 'idk1', isPrivate: false, members: 12 },
      { id: 2, name: 'idk2', isPrivate: false, members: 5 },
      { id: 3, name: 'idk3', isPrivate: true, members: 3 },
    ] as Channel[],
  }),
  actions: {
    joinChannel(id: number) {
      console.log(`Joined channel with ID: ${id}`)
    },
  },
})
