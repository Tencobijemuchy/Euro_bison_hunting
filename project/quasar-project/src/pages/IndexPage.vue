<template>
  <q-page class="q-pa-xl column items-start">
    <div class="text-h6 q-mb-md">Home</div>

    <div v-if="user.isLogged">
      Logged as: <b>{{ user.fullName }}</b>
      <span> (nick: {{ user.me?.nickname }}, email: {{ user.me?.email }})</span>

      <q-separator spaced class="q-my-md" />

      <div class="text-subtitle1 q-mt-md">Available Channels</div>

      <q-list bordered class="rounded-borders q-mt-sm" v-if="channels.channels.length">
        <q-item v-for="ch in channels.channels" :key="ch.id" clickable>
          <q-item-section>
            <q-item-label>{{ ch.name }}</q-item-label>
            <q-item-label caption>
              {{ ch.isPrivate ? 'Private' : 'Public' }} • {{ ch.members }} members
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-btn
              dense
              color="primary"
              label="Join"
              @click="channels.joinChannel(ch.id)"
            />
          </q-item-section>
        </q-item>
      </q-list>

      <q-btn class="q-mt-md" color="secondary" icon="add" label="Create Channel" />
    </div>

    <div v-else>
      You are not logged in yet.
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useUserStore } from 'src/stores/user'
import { useChannelStore } from 'src/stores/channels'

const user = useUserStore()
const channels = useChannelStore()
</script>
