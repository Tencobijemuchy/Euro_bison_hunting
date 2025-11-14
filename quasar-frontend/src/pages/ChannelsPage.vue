<template>
  <q-page class="q-pa-md">
    <div class="text-h6 q-mb-md">Channels</div>

    <q-form @submit.prevent="createOrJoin">
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-8 col-md-6">
          <q-input v-model="newName" label="channel name" filled />
        </div>
        <div class="col-4 col-md-2">
          <q-toggle v-model="isPrivate" label="Private" />
        </div>
        <div class="col-12 col-md-4 self-end">
          <q-btn type="submit" color="primary" label="/join" class="full-width" @click="createOrJoin" />
        </div>
      </div>
    </q-form>

    <q-list bordered separator>
      <q-item v-for="ch in channels" :key="ch.name" clickable @click="go(ch.name)" :class="{ 'invited-outline': isInvited(ch) }">
        <q-item-section>
          <q-item-label>#{{ ch.name }} <q-badge v-if="isInvited(ch)" class="q-ml-sm" color="warning" text-color="black" label="invited" /></q-item-label>
          <q-item-label caption>
            members: {{ ch.members.length }} {{ ch.isPrivate ? 'private' : 'public' }}
          </q-item-label>
        </q-item-section>
        <q-item-section side class="row items-center q-gutter-sm">

          <q-btn
            v-if="isDev"
            dense flat icon="mail" label="Simulate invite"
            @click.stop="channelsStore.simulateTopInvite(ch.name, me)"
          />
          <q-icon name="chevron_right" />
        </q-item-section>
      </q-item>
    </q-list>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useChannelsStore } from 'src/stores/channels'
import { useCommands } from 'src/composables/useCommands'
import { onCommandSubmit } from 'src/utils/cmdBus'
import { useUserStore } from 'src/stores/user'
import type { Channel } from 'src/stores/channels'


const router = useRouter()
const channelsStore = useChannelsStore()
const user = useUserStore()
const me = computed(() => user.me?.nickname || '')

const channels = computed(() => channelsStore.sortedForUser(me.value))
const newName = ref('')
const isPrivate = ref(false)
const isDev = import.meta.env.DEV

// inicializacia useCommands pre list page: podporuj len /join a po uspechu presmeruj
const { run: runCmd } = useCommands({
  onJoinSuccess: (channelName) => {
    void router.push({ name: 'channel', params: { channelName } })
  }
})

// registracia globalneho command busu (footer input -> useCommands)
let offBus: null | (() => void) = null
onMounted(() => {
  offBus = onCommandSubmit((text) => runCmd(text))
})

// odregistrovanie busu pri opusteni stranky
onBeforeUnmount(() => {
  if (offBus) offBus()
})

// handler: klik na tlacidlo /join pouzije rovnaku cestu cez useCommands
function createOrJoin() {
  const name = newName.value.trim()
  if (!name) return
  runCmd(`/join ${name}${isPrivate.value ? ' private' : ''}`)
  newName.value = ''
  isPrivate.value = false
}

function isInvited(ch: Channel) {
  return Boolean(ch.topInvitedFor?.[me.value])
}

// handler: preklik na detail konkretneho kanala zo zoznamu
async function go(name: string) {
  await router.push(`/c/${encodeURIComponent(name)}`)
}
</script>


