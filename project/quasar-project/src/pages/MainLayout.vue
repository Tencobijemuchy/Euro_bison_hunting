<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>Slack-lite</q-toolbar-title>

        <div v-if="user.isLogged" class="row items-center q-gutter-sm">
          <q-badge color="primary">
            {{ user.fullName }} ({{ user.me?.nickname }})
          </q-badge>
          <q-btn dense flat icon="logout" @click="user.logout()" />
        </div>
        <div v-else>
          <q-btn dense flat label="Login" @click="$router.push('/login')" />
          <q-btn dense flat label="Register" @click="$router.push('/register')" />
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useUserStore } from 'src/stores/user'
const user = useUserStore()
onMounted(() => user.loadSession())
</script>
