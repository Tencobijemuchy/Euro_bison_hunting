<template>
  <q-page class="q-pa-xl column items-start">
    <div class="text-h6 q-mb-md">Home</div>



    <div v-if="user.isLogged">
      Logged as: <b>{{ user.fullName }}</b>
      <span> (nick: {{ user.me?.nickname }}, email: {{ user.me?.email }})</span>
    </div>
    <div v-else>
      You are not logged in yet.
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useUserStore } from 'src/stores/user'
const user = useUserStore()
</script>
