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


export default boot(() => {
  const URL = 'http://localhost:3333'
  socket = io(URL, { transports: ['websocket'] })

  const channels = useChannelsStore()
  const user = useUserStore()

  const tryAuth = () => {
    const meId = user.me?.id
    if (socket.connected && meId) {
      socket.emit('auth', { userId: meId })
    }
  }

  socket.on('connect', () => {
    tryAuth()
  })

  watch(
    () => user.me?.id,
    () => {
      tryAuth()
    },
    { immediate: true }
  )

  socket.on('channels:created', (ch) => {
    channels.addOrUpdateChannel(ch)
  })

  socket.on('channels:invited', ({ channelName, invitee, createdAt }) => {
    channels.markInvited(channelName, invitee, createdAt)
  })

  // --- NOTIFIKÁCIE NA NOVÉ SPRÁVY ---
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

// pri logine skús nenápadne vypýtať permission (niekedy browser odmietne bez user gestá)
  watch(
    () => user.me?.id,
    (id) => {
      if (id) void ensureNotificationPermission()
    }
  )

  socket.on('messages:created', async (msg) => {
    const m = msg as IncomingMsg

    channels.addIncomingMessage(m)

    const me = user.me
    if (!me) return

    // notifikácie len keď appka nie je visible
    if (isVisible()) return

    // rešpektuj DND a user nastavenia
    if (me.status === 'dnd') return
    if (me.notifications === 'off') return

    // ak user chce len mentiony → notif iba keď je spomenutý
    if (me.notifications === 'mentions') {
      const mentionedId = m.mentionedUserId
      if (!mentionedId || Number(mentionedId) !== Number(me.id)) return
    }

    const ok = await ensureNotificationPermission()
    if (!ok) return

    const sender = m.author?.nickName || m.author?.nickname || 'Unknown'

    const text = (m.body || m.text || '').toString().trim()
    const snippet = text.length > 140 ? text.slice(0, 140) + '…' : text

    const ch = channels.channels.find((c) => Number(c.id) === Number(m.channelId))
    const title = ch ? `#${ch.channelName} — ${sender}` : sender

    new Notification(title, {
      body: snippet,
      tag: `channel-${m.channelId}`,
    })

  })



  const router = useRouter()

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

})

export { socket }
