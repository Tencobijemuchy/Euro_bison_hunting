import { defineStore } from 'pinia'
import { api } from 'src/boot/axios'
import axios, { AxiosError } from 'axios'
import { useUserStore } from './user'
import { socket } from 'src/boot/socket' // Pridaj import socketu

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
  messages?: ChatMessage[]
}

export type ChatAuthor = {
  nickName?: string
  nickname?: string
  nick_name?: string
  email?: string
}

export type ChatMessage = {
  id: string | number
  channelId: number | string
  body?: string
  text?: string
  createdAt?: string
  author?: ChatAuthor
  mentionedUserId?: number | string | null
}



// mapa typing stavov: channel -> nick -> timestamp (lokalne)
type TypingMap = Record<string, Record<string, number>>

export const useChannelsStore = defineStore('channels', {
  state: () => ({
    channels: [] as Channel[],
    drafts: {} as Record<string, Record<string, string>>,
    typing: {} as TypingMap,
    loading: false,
    error: null as string | null,
    socketInitialized: false,
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

  },

  actions: {
    initializeSocketListeners() {
      if (this.socketInitialized) return

      //console.log('[Channels Store] Initializing socket listeners')

      // Listener pre vytvorenie kanála
      socket.on('channels:created', (channel: Channel) => {
        //console.log('[Socket] Channel created:', channel.channelName)
        this.addOrUpdateChannel(channel)
      })

      socket.on('channels:deleted', (data: { id: number; channelName: string }) => {
        //console.log('[Socket] Channel deleted:', data.channelName)
        this.channels = this.channels.filter((ch) => ch.id !== data.id)
      })

      // Listener pre invite
      socket.on('channels:invited', (data: { channelName: string; invitee: string; createdAt: string }) => {
        //console.log('[Socket] User invited:', data)
        this.markInvited(data.channelName, data.invitee, data.createdAt)
      })

      socket.on(
        'draft:update',
        (data: { channelName: string; nickname: string; text: string }) => {
          this.setDraft(data.channelName, data.nickname, data.text)

          let channelTyping = this.typing[data.channelName]
          if (!channelTyping) {
            channelTyping = {}
            this.typing[data.channelName] = channelTyping
          }

          if (data.text.trim()) {
            channelTyping[data.nickname] = Date.now()
          } else {
            delete channelTyping[data.nickname]
          }

        }
      )

      this.socketInitialized = true
    },

    cleanupSocketListeners() {
      //console.log('[Channels Store] Cleaning up socket listeners')
      socket.off('channels:created')
      socket.off('channels:deleted')
      socket.off('channels:invited')
      socket.off('draft:update')
      this.socketInitialized = false
    },

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
        //console.error('Error loading channels:', err)
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
        const error = err as { response?: { status?: number; data?: { message?: string } } }

        if (error.response?.status === 403) {
          const message = error.response?.data?.message || `You are banned from #${nameRaw}`
          this.error = message
          throw new Error(message)
        }

        this.error = error.response?.data?.message || 'Failed to join channel'
        //console.error('Error joining channel:', err)
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

    // Kick user (vote alebo permaban)
    async kickUser(channelName: string, kickerNickname: string, targetNickname: string) {
      try {
        const response = await api.post(`/channels/${channelName}/kick`, {
          kickerNickname,
          targetNickname,
        })

        // refreshni kanály aby si videl banned list atď.
        await this.loadChannels()

        return response.data as {
          message: string
          permanent: boolean
          kickCount: number
          remaining?: number
        }
      } catch (error) {
        const message =
          error instanceof AxiosError
            ? error.response?.data?.message || 'Failed to kick'
            : 'Failed to kick'
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
          },
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
            'X-User-Id': userStore.me.id.toString(),
          },
        })

        //del kanal z local store
        this.channels = this.channels.filter((ch) => ch.id !== channelId)

        return response.data
      } catch (error) {
        const message =
          error instanceof AxiosError
            ? error.response?.data?.message || 'Failed to delete channel'
            : 'Failed to delete channel'
        throw new Error(message)
      }
    },

    setDraft(channelName: string, nickname: string, text: string) {
      if (!channelName || !nickname) return
      if (!this.drafts[channelName]) {
        this.drafts[channelName] = {}
      }
      this.drafts[channelName][nickname] = text
    },


    broadcastDraft(channelName: string, text: string) {
      const userStore = useUserStore()
      const nickname =
        userStore.me?.nickname ||
        userStore.me?.email

      if (!nickname) return

      const ch = this.channels.find((c) => c.channelName === channelName)
      if (!ch?.id) return

      // uložíš si vlastný draft
      this.setDraft(channelName, nickname, text)

      // (voliteľne) update typing mapy
      if (text.trim()) {
        if (!this.typing[channelName]) this.typing[channelName] = {}
        this.typing[channelName][nickname] = Date.now()
      } else if (this.typing[channelName]) {
        delete this.typing[channelName][nickname]
      }

      socket.emit('draft:update', {
        channelId: ch.id,
        channelName,
        nickname,
        text,
      })
    },

    addOrUpdateChannel(ch: Channel) {
      const idx = this.channels.findIndex((c) => c.channelName === ch.channelName || c.id === ch.id)

      if (idx !== -1) {
        this.channels[idx] = { ...this.channels[idx], ...ch }
      } else {
        this.channels.unshift(ch)
      }
    },

    markInvited(channelName: string, invitee: string, createdAt?: string) {
      const c = this.channels.find((c) => c.channelName === channelName)
      if (!c) return

      if (!c.topInvitedFor) c.topInvitedFor = {}
      c.topInvitedFor[invitee] = createdAt ?? new Date().toISOString()
    },

    addIncomingMessage(msg: ChatMessage) {
      const ch = this.channels.find((c) => c.id === msg.channelId)
      if (!ch) return

      if (!ch.messages) ch.messages = []

      const exists = ch.messages.some((m: ChatMessage) => m.id === msg.id)
      if (!exists) {
        ch.messages.push(msg)
      }
    },

    removeMessage(channelId: number | string, messageId: number | string) {
      const channel = this.channels.find((ch) => Number(ch.id) === Number(channelId))
      if (!channel) return

      // Ak máš messages ako array priamo v channel objekte:
      if (channel.messages) {
        channel.messages = channel.messages.filter((msg) => Number(msg.id) !== Number(messageId))
      }
    },

    draftOf(channelName: string, nickname: string): string {
      if (!channelName || !nickname) return ''
      return this.drafts[channelName]?.[nickname] ?? ''
    }
  },
})
