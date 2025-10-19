<template>
  <div :class="barClass" class="w-full q-pa-sm row items-center q-gutter-sm" style="border-top: 1px solid var(--q-separator-color, rgba(0,0,0,.12));">
    <q-input
      v-model="cmd"
      dense
      outlined
      :dark="isDark"
      :input-class="isDark ? 'text-white' : 'text-dark'"
      :placeholder="isDark ? 'Global command… (e.g. /join channelName [private])' : 'Global command… (e.g. /join channelName [private])'"
      class="col"
      @keyup.enter="run"
    />
    <q-btn dense :flat="false" color="primary" label="RUN" @click="run" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Notify, Dark } from 'quasar'
import { useRouter } from 'vue-router'
import { useUserStore } from 'src/stores/user'
import { useChannelsStore } from 'src/stores/channels'

const cmd = ref('')
const router = useRouter()
const user = useUserStore()
const channels = useChannelsStore()

const isDark = computed(() => Dark.isActive === true)
const barClass = computed(() => (isDark.value ? 'bg-grey-9 text-white' : 'bg-white text-dark'))

function run() {
  const meMaybe = user.me?.nickname
  if (!meMaybe) {
    Notify.create({ type: 'warning', message: 'Please login first.' })
    return
  }
  const me = meMaybe
  const raw = cmd.value.trim()
  if (!raw) return

  if (raw.startsWith('/join')) {
    const parts = raw.split(/\s+/)
    if (parts.length < 2) {
      Notify.create({ type: 'negative', message: 'Usage: /join channelName [private]' })
      return
    }
    const channelName = parts[1] ?? ''
    if (!channelName) {
      Notify.create({ type: 'negative', message: 'Channel name is required.' })
      return
    }
    const isPrivate = (parts[2]?.toLowerCase() ?? '') === 'private'
    try {
      const res = channels.joinChannel(me, channelName, isPrivate)
      Notify.create({
        type: 'positive',
        message: res.created ? `Channel ${channelName} created.` : `Joined ${channelName}.`
      })
      void router.push({ name: 'channel', params: { channelName } })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Join failed.'
      Notify.create({ type: 'negative', message: msg })
    } finally {
      cmd.value = ''
    }
    return
  }

  Notify.create({ type: 'info', message: 'Global bar supports /join only. Use channel bar for /invite, /revoke, /kick, /quit, /cancel.' })
  cmd.value = ''
}
</script>
