<template>
  <!-- channel page s tlacidlom pre show members -->
  <q-page class="column fit">
    <div class="row items-center q-pa-sm q-gutter-sm bg-grey-2 channel-header">
      <q-btn
        flat
        dense
        icon="arrow_back"
        @click="goBack"
        aria-label="Späť na kanály"
      />
      <div class="channel-title">#{{ channelName }}</div>
      <q-badge v-if="channel?.isPrivate" color="secondary" label="private" />
      <q-badge v-if="channel?.ownerNickname" color="primary" :label="`owner: ${channel.ownerNickname}`" />
      <q-space />

      <div class="typing-bar">
        <a

          href="#"
          class="typing-chip typing-link"
          @click.prevent="openPeek('@david')"
        >
          <span class="nick">{{'@david'}}</span>
          <span class="typing-verb">&nbsp;is typing</span>

          <!-- BODKY MUSIA BYŤ VNÚTRI .dots -->
          <span class="dots" aria-hidden="true">
          <span class="dot dot-1">.</span>
          <span class="dot dot-2">.</span>
          <span class="dot dot-3">.</span>
        </span>
        </a>
      </div>

      <q-space />
      <q-btn dense flat size="lg" icon="group" label="Members" @click="openMembers" />
    </div>

    <!-- hlavny panel so zoznamom sprav a scroll handlerom -->
    <div ref="pane" class="col scroll q-pa-md chat-pane glass" @scroll="onScroll">

      <!-- render jednotlivych sprav-->
      <div v-for="m in messages" :key="m.id" class="q-mb-sm">
        <div class="row no-wrap q-gutter-sm items-start msg">
          <q-avatar size="60px" color="primary" text-color="white">
            {{ initialsFromFullName(m.author) }}
          </q-avatar>          <div class="col">
          <div class="text-caption">
            <!-- meno -->
            <span class="text-weight-medium">{{ m.author }}</span>
            <!-- cas -->
            <span class="text-grey-6 q-ml-xs">{{ formatTs(m.ts) }}</span>
          </div>
          <!-- sprava -->
          <div v-html="renderText(m.text)" />
        </div>
        </div>
      </div>
    </div>

  </q-page>

  <!--pole na text zobrazi sa akoze kto co pise-->
  <q-dialog v-model="peekOpen" persistent>
    <q-card class="q-pa-md peek-card">
      <div class="row items-center justify-between q-mb-sm">
        <div class="text-subtitle1">
          {{ peekNick }} is typing ...
        </div>
        <q-btn dense flat round icon="close" @click="closePeek" />
      </div>

      <q-input
        v-model="peekText"
        type="textarea"
        autogrow
        readonly
        class="peek-input is-dark-field"
      />
    </q-card>
  </q-dialog>



</template>

<script setup lang="ts">


//import DraftPeekDialog from 'src/components/DraftPeekDialog.vue'
import { computed, onMounted,onBeforeUnmount, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
//import { Dialog } from 'quasar'
import { useChannelsStore } from 'src/stores/channels'
import { useCommands } from 'src/composables/useCommands'
//import MemberListDialog from 'src/components/MemberListDialog.vue'
import { onCommandSubmit } from 'src/utils/cmdBus'
import axios from 'axios'
import { socket } from 'src/boot/socket'
import { useUserStore } from 'src/stores/user'
// pomocny typ spravy pre zoznam
type Msg = { id: string; author: string; text: string; ts: number; system?: boolean }

// ziskanie route/router a prislusnych storov
const route = useRoute()
const router = useRouter()
const channelName = String(route.params.channelName)
const channels = useChannelsStore()
//const { run: runCmd } = useCommands({ channelName })

const API = axios.create({
  baseURL: 'http://localhost:3333/api',
})

const userId = Number(sessionStorage.getItem('userId') || '0')

// reaktivne stavy pre input a spravy
//const input = ref('')
const messages = ref<Msg[]>([])


type BackendAuthor = {
  nickname?: string
  nickName?: string
  nick_name?: string
  email?: string
}

type BackendMessage = {
  id: number | string
  body: string
  createdAt: string
  author?: BackendAuthor
}

type SocketBackendMessage = BackendMessage & {
  channelId?: number | string
  channel_id?: number | string
  authorNickname?: string
}

type BackendMessageWithNickname = {
  id: number | string
  body: string
  createdAt: string
  authorNickname?: string
}


function mapBackendMsg(m: BackendMessage | BackendMessageWithNickname): Msg {
  // Ak máme priamo authorNickname (z POST response)
  if ('authorNickname' in m && m.authorNickname) {
    const nick = m.authorNickname
    return {
      id: String(m.id),
      author: nick.startsWith('@') ? nick : `@${nick}`,
      text: m.body,
      ts: new Date(m.createdAt).getTime(),
    }
  }


  if ('author' in m && m.author) {
    const nick =
      m.author.nickname ||
      m.author.nickName ||
      m.author.nick_name ||
      m.author.email ||
      'unknown'

    return {
      id: String(m.id),
      author: nick.startsWith('@') ? nick : `@${nick}`,
      text: m.body,
      ts: new Date(m.createdAt).getTime(),
    }
  }

  // Fallback
  return {
    id: String(m.id),
    author: '@unknown',
    text: m.body,
    ts: new Date(m.createdAt).getTime(),
  }
}


const limit = 30
const offset = ref(0)
const hasMore = ref(true)
const loadingOlder = ref(false)

async function loadInitialMessages() {
  if (!channel.value?.id) return
  try {
    const res = await API.get(`/channels/${channel.value.id}/messages`, {
      headers: { 'X-User-Id': userId },
      params: { limit, offset: 0 },
    })

    const batch = (res.data || []).map(mapBackendMsg).reverse()
    messages.value = batch
    offset.value = batch.length
    hasMore.value = batch.length === limit
    scrollToBottomCb()
  } catch (e) {
    //console.error('loadInitialMessages failed', e)
  }
}

async function loadOlderMessages() {
  if (loadingOlder.value || !hasMore.value || !channel.value?.id) return
  loadingOlder.value = true

  try {
    const res = await API.get(`/channels/${channel.value.id}/messages`, {
      headers: { 'X-User-Id': userId },
      params: { limit, offset: offset.value },
    })

    const batch = (res.data || []).map(mapBackendMsg).reverse()
    if (batch.length === 0) {
      hasMore.value = false
      return
    }

    offset.value += batch.length
    hasMore.value = batch.length === limit
    messages.value.unshift(...batch)
  } catch (e) {
    //console.error('loadOlderMessages failed', e)
  } finally {
    loadingOlder.value = false
  }
}





function goBack() {
  void router.push('/channels')
}


const channel = computed(() => channels.byName(channelName))
//const typingOthers = computed(() => channels.typingList(channelName, me.value))

// generator unikatneho id
function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ref na scroll panel
const pane = ref<HTMLElement | null>(null)


// scroll handler: ked si blizko vrchu, dotiahni dalsi batch a zachovaj poziciu
async function onScroll() {
  const el = pane.value
  if (!el) return

  if (el.scrollTop <= 40) {
    const oldH = el.scrollHeight
    await loadOlderMessages()
    await nextTick()
    el.scrollTop += (el.scrollHeight - oldH)
  }
}





//zabezpeci ze sa text zobrazi
function renderText(t: string) {
  const esc = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc.replace(/@([A-Za-z0-9_-]+)/g, '<span class="text-primary">@$1</span>')
}

// formatovanie timestampu na hh:mm pre spravy
function formatTs(ts: number) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}


// otvorenie dialogu zoznamu clenov
function openMembers() {
  const ch = channel.value
  if (!ch) return
  void runCmd('/list')
}

// stav a funkcie pre draft peek dialog
const peekOpen = ref(false)
const peekNick = ref<string>('')
const peekText = ref('')

// otvorenie draft peek pre konkretneho clena
function openPeek (nick: string) {
  peekNick.value = nick
  peekText.value = channels.draftOf(channelName, nick)
  peekOpen.value = true
}
//zatvori okno peeku
function closePeek () {
  peekOpen.value = false
}

// zaregistruj sa na command bus
let offBus: (() => void) | null = null
onMounted(() => {
  socket.on('message:new', handleSocketMessage)
  offBus = onCommandSubmit((text) => {
    void runCmd(text)
  })

  channels.setDraft(channelName, '@david', 'text text text text text')
})

onBeforeUnmount(() => {
  const id = channel.value?.id
  if (id) socket.emit('leave:channel', { channelId: id })
  socket.off('message:new', handleSocketMessage)
  if (offBus) offBus()
})

// odregistrovanie z command bus
watch(() => route.params.channelName, (nv) => {
  const n = String(nv)
  if (n !== channelName) {
    void router.replace({ name: 'channel', params: { channelName: n } })
  }
})

watch(
  () => channel.value?.id,
  async (id, oldId) => {
    //console.log('Channel changed:', { id, oldId, channel: channel.value })

    if (oldId) {
      socket.emit('leave:channel', { channelId: oldId })
    }
    if (id) {
      socket.emit('join:channel', { channelId: id })
      await new Promise(resolve => setTimeout(resolve, 100))
      await loadInitialMessages()

      console.log('After loadInitialMessages:', {
        channelId: id,
        ownerNickname: channel.value?.ownerNickname,
        messagesCount: messages.value.length
      })
    }
  },
  { immediate: true }
)



// callback: prida spravu dolu
async function pushMessageCb(msg: { author: string; text: string; ts?: number }) {
  if (!channel.value?.id || !userId) {
    messages.value.push({ id: uuid(), author: msg.author, text: msg.text, ts: msg.ts ?? Date.now() })
    return
  }

  try {
    const res = await API.post(
      `/channels/${channel.value.id}/messages`,
      { content: msg.text },
      { headers: { 'X-User-Id': userId, 'Content-Type': 'application/json' } }
    )

    const saved = mapBackendMsg(res.data.message)
    if (!messages.value.some((m) => m.id === saved.id)) {
      messages.value.push(saved)
      scrollToBottomCb()
    }

  } catch (e) {
    console.error(e)

    const userStore = useUserStore()
    const nickname = userStore.me?.nickname || msg.author
    messages.value.push({
      id: uuid(),
      author: nickname.startsWith('@') ? nickname : `@${nickname}`,
      text: msg.text,
      ts: msg.ts ?? Date.now()
    })
    scrollToBottomCb()
  }
}

// callback: scroll na spodok
function scrollToBottomCb() {
  void nextTick(() => {
    const el = pane.value
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'instant' as ScrollBehavior })
  })
}

function handleSocketMessage(bm: SocketBackendMessage) {
  const chId = String(channel.value?.id ?? '')
  const msgChId = String(bm.channelId ?? bm.channel_id ?? '')

  // ignoruj správy z iných kanálov
  if (!chId || msgChId !== chId) return

  const mapped = mapBackendMsg(bm)

  // deduplikácia (sender dostane svoju správu späť cez socket)
  if (messages.value.some((m) => m.id === mapped.id)) return

  messages.value.push(mapped)
  scrollToBottomCb()
}

const { run: runCmd } = useCommands({
  channelName,
  pushMessage: (msg) => { void pushMessageCb(msg) },
  onAfterNormalMessage: scrollToBottomCb,
  router,
})

// helper na vypocet inicial z celeho mena (berie prve dve slova)
function initialsFromFullName(fullName: string) {
  const clean = (fullName ?? '').replace(/^@+/, '').trim()
  if (!clean) return '?'
  const parts = clean.split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  const ini = (first + second).toUpperCase()
  return ini || '?'
}
</script>


<style scoped>
.col.scroll {
  overflow-y: auto;
  min-height: 0;
}

.channel-header {
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
}
.msg .text-caption { font-size: 14px; }

.channel-title {
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.2px;
  font-size: clamp(22px, 2.6vw, 34px);

}
.col.scroll::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.chat-pane {
  align-self: center;
  width:  50vw;

  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 28px rgba(0,0,0,0.18);


  margin-bottom: 12vh;
}

.msg {
  font-size: 18px;
  line-height: 1.6;
  max-width: 720px;
  margin: 0 auto;
}

.typing-bar{
  font-size: clamp(16px, 1.6vw, 18px);
  line-height: 1.4;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  color: #B7C3D0;
}
.typing-chip{ white-space: nowrap; }
.typing-verb{ opacity: .9; }

.typing-link{
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 9999px;
  text-decoration: none;
  color: inherit;
  background: transparent;
  cursor: pointer;
  transition: background .18s ease, transform .06s ease;
}

.typing-link:hover{  background: rgba(255,255,255,0.06); }
.typing-link:active{ transform: translateY(1px); }
.typing-link:focus-visible{ outline: 2px solid #4aa3ff; outline-offset: 2px; }

.typing-bar .nick{ color: inherit !important; }

.dots{
  position: relative;
  display: inline-block;
  width: 3ch;
  height: 1em;
  margin-left: 2px;
}
.dot{
  position: absolute;
  top: 0;
  opacity: 0;
  font-weight: 700;
  animation: oneDot 1s infinite steps(1, end);
}

.dot-1{ left: 0;    animation-delay: 0s;   }
.dot-2{ left: 1ch;  animation-delay: .2s;  }
.dot-3{ left: 2ch;  animation-delay: .4s;  }

@keyframes oneDot{
  0%, 33%   { opacity: 1; }
  33.001%, 100% { opacity: 0; }
}


@media (max-width: 800px) {
  .chat-pane {
    width: 100vw;
    margin-left: calc(50% - 50vw);
    margin-right: calc(50% - 50vw);

  }

}

.peek-card {
  width: min(680px, 92vw);
  max-height: 80vh;
  overflow: hidden;
  border-radius: 14px;
}

@media (max-width: 1023px) {
  .peek-card {
    width: min(560px, 94vw);
    max-height: 78vh;
  }
}

@media (max-width: 599px) {
  .peek-card {
    width: 94vw;
    max-height: 72vh;
  }
}

.peek-input :deep(textarea) {
  max-height: 42vh;
  overflow: auto !important;
  line-height: 1.5;
}

@media (max-width: 599px) {
  .peek-input :deep(textarea) {
    max-height: 38vh;
    font-size: 0.95rem;
  }
}

</style>
