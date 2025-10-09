import { defineStore } from 'pinia'

export type Channel = {
  id: number
  name: string
  isPrivate: boolean
  members: number
  joined: boolean
}

export const useChannelStore = defineStore('channels', {
  state: () => ({
    channels: [
      { id: 1, name: 'idk1', isPrivate: false, members: 12,joined: true },
      { id: 2, name: 'idk2', isPrivate: false, members: 5,joined: false},
      { id: 3, name: 'idk3', isPrivate: true, members: 3 ,joined: false},
      { id: 4, name: 'idk4', isPrivate: false, members: 12, joined: true },
      { id: 5, name: 'idk5', isPrivate: false, members: 5,joined: false },
      { id: 6, name: 'idk6', isPrivate: true, members: 3,joined: false},
    ] as Channel[],
  }),
  getters: {
    joinedChannels:   (s) => s.channels.filter(c => c.joined),
    availableChannels:(s) => s.channels.filter(c => !c.joined),
  },
  actions: {
    joinChannel(id: number) {
      const ch = this.channels.find(c => c.id === id)
      if (ch && !ch.joined) {
        ch.joined = true
        ch.members += 1
        console.log(`Joined channel: ${ch.name}`)
      }
    },
    leaveChannel(id: number) {
      const ch = this.channels.find(c => c.id === id)
      if (ch && ch.joined) {
        ch.joined = false
        ch.members = Math.max(0, ch.members - 1)
        console.log(`Left channel: ${ch.name}`)
      }
    },
  },
})
