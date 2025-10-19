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
          <q-btn dense flat icon="settings">
            <q-menu>
              <q-list style="min-width:220px">
                <q-item>
                  <q-item-section>Simulate app not visible</q-item-section>
                  <q-item-section side><q-toggle v-model="app.isAppVisible" /></q-item-section>
                </q-item>
                <q-separator />
                <q-item><q-item-section class="text-caption">Status</q-item-section></q-item>
                <q-item><q-item-section><q-radio v-model="app.status" val="online" label="Online" /></q-item-section></q-item>
                <q-item><q-item-section><q-radio v-model="app.status" val="dnd" label="Do Not Disturb" /></q-item-section></q-item>
                <q-item><q-item-section><q-radio v-model="app.status" val="offline" label="Offline" /></q-item-section></q-item>
                <q-separator />
                <q-item><q-item-section class="text-caption">Notifications</q-item-section></q-item>
                <q-item><q-item-section><q-radio v-model="app.notifMode" val="all" label="All" /></q-item-section></q-item>
                <q-item><q-item-section><q-radio v-model="app.notifMode" val="mentionsOnly" label="Mentions only" /></q-item-section></q-item>
                <q-item><q-item-section><q-radio v-model="app.notifMode" val="off" label="Off" /></q-item-section></q-item>
              </q-list>
            </q-menu>
          </q-btn>

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

        <q-item v-if="user.isLogged" clickable to="/channels">
          <q-item-section avatar><q-icon name="forum" /></q-item-section>
          <q-item-section>Channels</q-item-section>
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

    <q-footer class="q-pa-none">
      <GlobalCommandBar />
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from 'src/stores/user'
import { useAppStore } from 'src/stores/app'
import GlobalCommandBar from 'src/components/GlobalCommandBar.vue'
import { useChannelsStore } from 'src/stores/channels'

const app = useAppStore()
const user = useUserStore()
const leftDrawerOpen = ref(false)

onMounted(() => user.loadSession())

const channels = useChannelsStore()
onMounted(() => {
  channels.cleanupStaleChannels()
})
</script>
