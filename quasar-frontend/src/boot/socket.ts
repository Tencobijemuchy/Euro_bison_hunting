import { boot } from 'quasar/wrappers'
import { io, type Socket } from 'socket.io-client'
import { useChannelsStore } from 'src/stores/channels'
import { useUserStore } from 'src/stores/user'
import { watch } from 'vue'
import { Notify } from 'quasar'
import { useRouter } from 'vue-router'

let socket: Socket

type IncomingMsg = {
  id: number | string
  channelId: number | string
  body?: string
  text?: string
  createdAt?: string
  mentionedUserId?: number | string | null
  author?: {
    id?: number | string
    nickName?: string
    nickname?: string
  }
}

type NotificationPayload = {
  type: string
  messageId: number
  channelId: number
  channelName: string
  authorId: number
  authorNickname: string
  body: string
  mentionedUserId?: number
  timestamp: string
}

export default boot(() => {
  const URL = 'http://localhost:3333'
  socket = io(URL, { transports: ['websocket'] })

  const channels = useChannelsStore()
  const user = useUserStore()
  const router = useRouter()

  const tryAuth = () => {
    const meId = user.me?.id
    if (socket.connected && meId) {
      socket.emit('auth', { userId: meId })
    }
  }

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id)
    tryAuth()
  })

  socket.on('disconnect', () => {
    console.log('Socket disconnected')
  })

  watch(
    () => user.me?.id,
    () => {
      tryAuth()
    },
    { immediate: true }
  )

  // Auth confirmation
  socket.on('auth:success', (data: { userId: number }) => {
    console.log('Auth successful:', data.userId)
  })

  socket.on('auth:error', (error: { message: string }) => {
    console.error('Auth error:', error.message)
  })

  // Channels events
  socket.on('channels:created', (ch) => {
    channels.addOrUpdateChannel(ch)
  })

  socket.on('channels:invited', ({ channelName, invitee, createdAt }) => {
    channels.markInvited(channelName, invitee, createdAt)
  })

  socket.on('channels:kicked', (payload) => {
    Notify.create({
      type: 'negative',
      message: payload.message ?? 'Bol si kicknutý z kanála',
    })

    // ak je user práve v tom kanáli → vyhoď ho späť na /channels
    if (router.currentRoute.value.params.channelName === payload.channelName) {
      void router.push('/channels')
    }
  })

  // --- MESSAGES ---
  socket.on('messages:created', (msg) => {
    const m = msg as IncomingMsg
    channels.addIncomingMessage(m)
  })

  socket.on('message:new', (msg) => {

    channels.addIncomingMessage(msg)
  })

  socket.on('message:deleted', (data: { messageId: number; channelId: number }) => {
    console.log('Message deleted:', data)
    // channels.removeMessage(data.channelId, data.messageId)
  })

  // --- NOTIFIKÁCIE (riadené backendom na základe DB nastavení) ---
  const isVisible = () => document.visibilityState === 'visible'
  const canUseNotifications = () =>
    typeof window !== 'undefined' && 'Notification' in window

  const ensureNotificationPermission = async (): Promise<boolean> => {
    if (!canUseNotifications()) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    try {
      const p = await Notification.requestPermission()
      return p === 'granted'
    } catch {
      return false
    }
  }

  // Pri logine skús vypýtať permission
  watch(
    () => user.me?.id,
    (id) => {
      if (id) void ensureNotificationPermission()
    }
  )

  socket.on('notification:new', async (payload: NotificationPayload) => {
    console.log('Notification received from backend:', payload)


    const me = user.me
    if (!me) return

    const rawMode = (me.notifications ?? 'all').toString().toLowerCase().trim()
    const isOff = rawMode === 'off'
    const isAll = rawMode === 'all'
    const isMentionsOnly = !isOff && !isAll

    if (isOff) {
      console.log('Notif mode = OFF')
      return
    }

    if (isMentionsOnly) {
      const mentionedId = Number(payload.mentionedUserId)
      const myId = Number(me.id)
      console.log('Notif mode = MENTIONS_ONLY', { mentionedId, myId })
      if (!mentionedId || mentionedId !== myId) {
        return
      }
    }

    if (isVisible()) {
      console.log('App is visible, skipping desktop notification')
      return
    }

    if (me.status === 'dnd') {
      console.log('User is in DND mode, skipping notification')
      return
    }

    const ok = await ensureNotificationPermission()
    if (!ok) {
      console.log('Notification permission not granted')
      return
    }

    const text = (payload.body || '').trim()
    const snippet = text.length > 140 ? text.slice(0, 140) + '…' : text
    const title = `#${payload.channelName} — ${payload.authorNickname}`

    const notification = new Notification(title, {
      body: snippet,
      tag: `channel-${payload.channelId}`,
      icon: '/src/assets/e_bison.png',
      badge: '/src/assets/e_bison.png',
    })

    notification.onclick = () => {
      window.focus()
      notification.close()

      const channel = channels.channels.find((c) => Number(c.id) === Number(payload.channelId))
      if (channel) {
        void router.push(`/channels/${channel.channelName}`)
      }
    }

    setTimeout(() => {
      notification.close()
    }, 5000)
  })

  // User status updates
  socket.on('user:status', (data: { userId: number; status: string }) => {
    console.log('User status update:', data)
    // Update user status v store ak potrebuješ
  })

  // User joined/left channel
  socket.on('user:joined', (data: { userId: number; channelId: number }) => {
    console.log('User joined channel:', data)
  })

  socket.on('user:left', (data: { userId: number; channelId: number }) => {
    console.log('User left channel:', data)
  })

  // Typing indicators
  socket.on('user:typing', (data: { userId: number; channelId: number; isTyping: boolean }) => {
    console.log('User typing:', data)
    // Update typing indicators v UI
  })

  // Error handling
  socket.on('error', (error: Error) => {
    console.error('Socket error:', error)
  })

  socket.on('connect_error', (error: Error) => {
    console.error('Connection error:', error)
  })
})

export { socket }

// Helper funkcie pre použitie v komponentoch
export function joinChannel(channelId: number) {
  socket.emit('join:channel', { channelId })
}

export function leaveChannel(channelId: number) {
  socket.emit('leave:channel', { channelId })
}

export function startTyping(channelId: number) {
  socket.emit('typing:start', { channelId })
}

export function stopTyping(channelId: number) {
  socket.emit('typing:stop', { channelId })
}
