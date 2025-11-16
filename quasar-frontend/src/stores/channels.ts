import { defineStore } from 'pinia'
import { api } from 'src/boot/axios'
import axios, { AxiosError } from 'axios'
import { useUserStore } from './user'


const API_URL = 'http://localhost:3333/api'

export type Channel = {
  id?: number
  channelName: string
  isPrivate: boolean
  ownerNickname: string
  ownerId: number
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
    user: () => useUserStore(),
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

    // Invite user
    async inviteUser(channelName: string, inviterNickname: string, inviteeNickname: string) {
      try {
        const response = await api.post(`/channels/${channelName}/invite`, {
          inviterNickname,
          inviteeNickname,
        })

        // Reload channels aby sa aktualizovali invitations
        await this.loadChannels()

        return response.data
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } }
        const message = error.response?.data?.message || 'Failed to invite user'
        throw new Error(message)
      }
    },

    // Revoke - odoberie usera alebo zrusi inv
    async revokeUser(channelName: string, revokerNickname: string, targetNickname: string) {
      try {
        const response = await api.delete(`/channels/${channelName}/revoke`, {
          data: {
            revokerNickname,
            targetNickname,
          }
        })

        // Reload channels aby sa aktualizovali members a invitations
        await this.loadChannels()

        return response.data
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } }
        const message = error.response?.data?.message || 'Failed to revoke'
        throw new Error(message)
      }
    },

    async deleteChannel(channelId: number) {
      try {
        const userStore = useUserStore()
        if (!userStore.me) throw new Error('Not authenticated')

        const response = await axios.delete(`${API_URL}/channels/${channelId}/quit`, {
          headers: {
            'X-User-Id': userStore.me.id.toString()
          }
        })

        //del kanal z local store
        this.channels = this.channels.filter(ch => ch.id !== channelId)

        return response.data
      } catch (error) {
        const message = error instanceof AxiosError
          ? error.response?.data?.message || 'Failed to delete channel'
          : 'Failed to delete channel'
        throw new Error(message)
      }
    },

    // Drafty su len lokalne (bez backendu)
    setDraft(channelName: string, nickname: string, text: string) {
      if (!this.drafts[channelName]) this.drafts[channelName] = {}
      this.drafts[channelName][nickname] = text
      if (!this.typing[channelName]) this.typing[channelName] = {}
      this.typing[channelName][nickname] = Date.now()
    },
  },
})
