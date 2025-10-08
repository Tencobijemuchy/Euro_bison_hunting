<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat dense round icon="menu"
          @click="leftDrawerOpen = !leftDrawerOpen"
          aria-label="Menu"
        />
        <q-toolbar-title>Slack-lite</q-toolbar-title>

        <div v-if="user.isLogged" class="row items-center q-gutter-sm">
          <q-badge color="primary">
            {{ user.fullName }} ({{ user.me?.nickname }})
          </q-badge>
          <q-btn dense flat icon="logout" @click="user.logout()" />
        </div>
        <div v-else class="row items-center q-gutter-sm">
          <q-btn dense flat label="Login" @click="$router.push('/login')" />
          <q-btn dense flat label="Register" @click="$router.push('/register')" />
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item clickable to="/">
          <q-item-section avatar><q-icon name="home" /></q-item-section>
          <q-item-section>Home</q-item-section>
        </q-item>

        <q-item v-if="!user.isLogged" clickable to="/login">
          <q-item-section avatar><q-icon name="login" /></q-item-section>
          <q-item-section>Login</q-item-section>
        </q-item>

        <q-item v-if="!user.isLogged" clickable to="/register">
          <q-item-section avatar><q-icon name="person_add" /></q-item-section>
          <q-item-section>Register</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from 'src/stores/user'

const user = useUserStore()
const leftDrawerOpen = ref(false)

onMounted(() => user.loadSession())
</script>
