<template>
  <q-page class="q-pa-xl">
    <q-card class="glass q-pa-lg">
      <div class="text-h6 q-mb-md">Home</div>

      <div v-if="user.isLogged">
        Logged as: <b>{{ user.fullName }}</b>
        <span> (nick: {{ user.me?.nickname }}, email: {{ user.me?.email }})</span>
      </div>
      <div v-else>
        You are not logged in yet.
      </div>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { useUserStore } from 'src/stores/user'
const user = useUserStore()
</script>

<style scoped>

.glass {
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.35);
}
</style>
