
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
      <q-item v-for="ch in channels" :key="ch.name" clickable @click="go(ch.name)">
        <q-item-section>
          <q-item-label>#{{ ch.name }}</q-item-label>
          <q-item-label caption>
            members: {{ ch.members.length }} • {{ ch.isPrivate ? 'private' : 'public' }}
          </q-item-label>
        </q-item-section>
        <q-item-section side><q-icon name="chevron_right" /></q-item-section>
      </q-item>
    </q-list>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useChannelsStore } from 'src/stores/channels'
import { useUserStore } from 'src/stores/user'

const user = useUserStore()
const me = computed(() => user.me?.nickname || '')

const router = useRouter()
const channelsStore = useChannelsStore()

const channels = computed(() => channelsStore.channels)
const newName = ref('')
const isPrivate = ref(false)

function createOrJoin() {
  if (!newName.value) return
  if (!me.value) return

  channelsStore.joinChannel(me.value, newName.value, isPrivate.value)
  void router.push({ name: 'channel', params: { channelName: newName.value } })

  newName.value = ''
  isPrivate.value = false
}


async function go(name: string) {
  await router.push(`/c/${encodeURIComponent(name)}`)
}

</script>

