import { defineStore } from 'pinia'
import { api } from 'src/boot/axios'

// typ jedneho kanala - channelName nie name!
export type Channel = {
  id?: number
  channelName: string
  isPrivate: boolean
  ownerNickname: string
  ownerId?: number
  members: string[]
  banned: string[]
  kickVotes: Record<string, string[]>
  createdAt: string
  lastActivityAt: string | null
  topInvitedFor: Record<string, string>
  status: string
}

// mapa draftov: channel -> nick -> text draftu (lokalne)
type DraftMap = Record<string, Record<string, string>>

// mapa typing stavov: channel -> nick -> timestamp (lokalne)
type TypingMap = Record<string, Record<string, number>>

export const useChannelsStore = defineStore('channels', {
  state: () => ({
    channels: [] as Channel[],
    drafts: {} as DraftMap,
    typing: {} as TypingMap,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    // POZOR: pouziva channelName nie name!
    byName: (s) => (name: string) =>
      s.channels.find((c) => c.channelName.toLowerCase() === name.toLowerCase()) || null,

    sortedForUser: (s) => (nickname: string) => {
      const hasInvite = (c: Channel) => Boolean(c.topInvitedFor?.[nickname])
      return [...s.channels].sort((a, b) => {
        const ai = hasInvite(a),
          bi = hasInvite(b)
        if (ai && !bi) return -1
        if (!ai && bi) return 1
        const la = a.lastActivityAt || a.createdAt
        const lb = b.lastActivityAt || b.createdAt
        return (lb || '').localeCompare(la || '')
      })
    },

    isOwner: (s) => (channelName: string, nickname: string) => {
      const c = s.channels.find((c) => c.channelName === channelName)
      return c ? c.ownerNickname === nickname : false
    },

    isMember: (s) => (channelName: string, nickname: string) => {
      const c = s.channels.find((c) => c.channelName === channelName)
      return c ? c.members.includes(nickname) : false
    },

    draftOf: (s) => (channelName: string, nickname: string) => {
      return s.drafts?.[channelName]?.[nickname] || ''
    },
  },

  actions: {
    // Nacita kanaly z backendu
    async loadChannels() {
      this.loading = true
      this.error = null

      try {
        const response = await api.get('/channels')
        this.channels = response.data
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } }
        this.error = error.response?.data?.message || 'Failed to load channels'
        console.error('Error loading channels:', err)
      } finally {
        this.loading = false
      }
    },

    // Join/vytvor kanal - vola backend API
    async joinChannel(
      a: string | { byNick?: string; name: string; isPrivate?: boolean },
      b?: string,
      c?: boolean
    ) {
      let byNick: string | undefined
      let nameRaw: string
      let isPrivateFlag: boolean | undefined

      // Podporuje obe signatury
      if (typeof a === 'string') {
        byNick = a
        nameRaw = (b ?? '').trim()
        isPrivateFlag = c
      } else {
        byNick = a.byNick
        nameRaw = (a.name ?? '').trim()
        isPrivateFlag = a.isPrivate
      }

      if (!nameRaw) throw new Error('Channel name required.')
      if (!byNick) throw new Error('User nickname required.')

      try {
        // Zavolaj AdonisJS backend
        const response = await api.post('/channels/join', {
          nickname: byNick,
          channelName: nameRaw,
          isPrivate: !!isPrivateFlag,
        })

        const { created, channel } = response.data

        // Aktualizuj lokalny stav
        const exists = this.channels.find(
          (c) => c.channelName.toLowerCase() === channel.channelName.toLowerCase()
        )

        if (exists) {
          Object.assign(exists, channel)
        } else {
          this.channels.push(channel)
        }

        return { created, channel }
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } }
        this.error = error.response?.data?.message || 'Failed to join channel'
        console.error('Error joining channel:', err)
        throw err
      }
    },

    // Drafty su len lokalne (bez backendu)
    setDraft(channelName: string, nickname: string, text: string) {
      if (!this.drafts[channelName]) this.drafts[channelName] = {}
      this.drafts[channelName][nickname] = text
      if (!this.typing[channelName]) this.typing[channelName] = {}
      this.typing[channelName][nickname] = Date.now()
    },

    // Simulate invite (zatial len lokalne)
    simulateTopInvite(channelName: string, targetNick: string) {
      const ch = this.byName(channelName)
      if (!ch) throw new Error('Channel not found.')
      ch.topInvitedFor[targetNick] = new Date().toISOString()
    },
  },
})
