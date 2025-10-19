<template>
  <q-page class="column">
    <div class="row items-center q-pa-sm q-gutter-sm bg-grey-2">
      <div class="text-subtitle1">#{{ channelName }}</div>
      <q-badge v-if="channel?.isPrivate" color="secondary" label="private" />
      <q-badge v-if="isOwner" color="primary" :label="`owner: ${channel?.ownerNickname}`" />
      <q-space />
      <q-btn dense flat icon="group" label="Members" @click="openMembers" />
    </div>

    <div class="col scroll q-pa-md">
      <div class="q-mb-md">
        <q-btn size="sm" outline label="Load older" @click="loadOlder" />
      </div>

      <div v-for="m in messages" :key="m.id" class="q-mb-sm">
        <div v-if="m.system" class="text-caption text-grey-7">
          <q-icon name="info" size="16px" class="q-mr-xs" />{{ formatTs(m.ts) }} — {{ m.text }}
        </div>
        <div v-else class="row no-wrap q-gutter-sm items-start">
          <q-avatar size="28px" color="primary" text-color="white">{{ m.author.slice(0,1).toUpperCase() }}</q-avatar>
          <div class="col">
            <div class="text-caption">
              <span class="text-weight-medium">{{ m.author }}</span>
              <span class="text-grey-6 q-ml-xs">{{ formatTs(m.ts) }}</span>
            </div>
            <div v-html="renderText(m.text)" />
          </div>
        </div>
      </div>
    </div>

    <div class="q-pa-sm">
      <div class="text-caption text-grey-6" v-if="typingOthers.length">
        <span v-for="n in typingOthers" :key="n">
          <a href="#" @click.prevent="openPeek(n)">{{ n }}</a> is typing…&nbsp;
        </span>
      </div>
      <div class="row items-center q-gutter-sm q-mt-sm">
        <q-input
          v-model="input"
          class="col"
          filled
          placeholder="Message or /command"
          @update:model-value="onInput"
          @keyup.enter="send"
        />
        <q-btn color="primary" label="Send" @click="send" />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Dialog, Notify } from 'quasar'
import { useUserStore } from 'src/stores/user'
import { useChannelsStore } from 'src/stores/channels'
import { useCommands } from 'src/composables/useCommands'
import MemberListDialog from 'src/components/MemberListDialog.vue'
import DraftPeekDialog from 'src/components/DraftPeekDialog.vue'

type Msg = { id: string; author: string; text: string; ts: number; system?: boolean }

const route = useRoute()
const router = useRouter()
const channelName = String(route.params.channelName)
const user = useUserStore()
const channels = useChannelsStore()
const { run: runCmd } = useCommands({ channelName })

const input = ref('')
const messages = ref<Msg[]>([])

const me = computed(() => user.me?.nickname || '')
const channel = computed(() => channels.byName(channelName))
const isOwner = computed(() => channels.isOwner(channelName, me.value))
const isMember = computed(() => channels.isMember(channelName, me.value))
const typingOthers = computed(() => channels.typingList(channelName, me.value))

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function loadOlder() {
  const now = Date.now()
  for (let i = 0; i < 3; i++) {
    messages.value.unshift({
      id: uuid(),
      author: 'system',
      text: `older message ${i + 1}`,
      ts: now - (i + 1) * 60_000,
      system: true
    })
  }
}

function renderText(t: string) {
  const esc = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc.replace(/@([A-Za-z0-9_-]+)/g, '<span class="text-primary">@$1</span>')
}

function formatTs(ts: number) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function onInput() {
  if (!me.value) return
  channels.setDraft(channelName, me.value, input.value)
}

function pushMessage(author: string, text: string, system = false) {
  messages.value.push({ id: uuid(), author, text, ts: Date.now(), system })
}

function send() {
  const txt = input.value.trim()
  if (!txt) return
  if (!me.value) {
    Notify.create({ type: 'warning', message: 'Please login first.' })
    return
  }
  if (!channel.value) {
    Notify.create({ type: 'negative', message: 'Channel not found.' })
    return
  }
  if (!isMember.value) {
    try {
      channels.joinChannel(me.value, channelName)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Join failed.'
      Notify.create({ type: 'negative', message: msg })
      return
    }
  }
  if (txt.startsWith('/')) {
    const handled = runCmd(txt)
    if (handled) {
      pushMessage(me.value, txt, true)
      input.value = ''
      channels.clearOwnDraft(channelName, me.value)
      return
    }
  }
  pushMessage(me.value, txt, false)
  channels.noteMessage(channelName)
  input.value = ''
  channels.clearOwnDraft(channelName, me.value)
}

function openMembers() {
  const ch = channel.value
  if (!ch) return
  Dialog.create({
    component: MemberListDialog,
    componentProps: { channelName: ch.name, ownerNickname: ch.ownerNickname, members: ch.members }
  })
}

function openPeek(nick: string) {
  const draft = channels.draftOf(channelName, nick)
  Dialog.create({
    component: DraftPeekDialog,
    componentProps: { nickname: nick, text: draft }
  })
}

onMounted(() => {
  channels.cleanupStaleChannels()
  if (!channel.value) {
    Notify.create({ type: 'negative', message: `Channel "${channelName}" does not exist.` })
    void router.push({ name: 'channels' })
    return
  }
})

watch(() => route.params.channelName, (nv) => {
  const n = String(nv)
  if (n !== channelName) {
    void router.replace({ name: 'channel', params: { channelName: n } })
  }
})
</script>

<style scoped>
.col.scroll { overflow-y: auto; }
</style>
