<template>
  <!-- hlavny layout: head + page + footer; view hHh lpR fFf drzi sticky header/footer -->
  <q-layout view="hHh lpR fFf" class="app-bg text-grey-2">
    <q-header :elevated="false" class="glass toolbar-xl q-px-md">
      <q-toolbar class="q-gutter-x-sm">
        <!--3ciarkova icona otvori list -->
        <q-btn flat dense round icon="menu" aria-label="Menu">
          <q-menu
            anchor="bottom left"
            self="top left"
            transition-show="slide-down"
            transition-hide="slide-up"
            class="glass top-nav-menu"
            :offset="[0, 8]"
          >
            <!--list pre home, channels, login, register  -->
            <q-list padding>
              <q-item clickable v-close-popup to="/">
                <q-item-section avatar><q-icon name="home" /></q-item-section>
                <q-item-section>Home</q-item-section>
              </q-item>

              <q-item v-if="user.isLogged" clickable v-close-popup to="/channels">
                <q-item-section avatar><q-icon name="forum" /></q-item-section>
                <q-item-section>Channels</q-item-section>
              </q-item>

              <q-item v-if="!user.isLogged" clickable v-close-popup to="/login">
                <q-item-section avatar><q-icon name="login" /></q-item-section>
                <q-item-section>Login</q-item-section>
              </q-item>

              <q-item v-if="!user.isLogged" clickable v-close-popup to="/register">
                <q-item-section avatar><q-icon name="person_add" /></q-item-section>
                <q-item-section>Register</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>


        <!-- logo -->
        <q-toolbar-title class="row items-center no-wrap">
          <q-avatar square size="80px" class="bg-transparent">
            <img src="src/assets/e_bison.png" alt="e-Bison logo" />
          </q-avatar>
          <span class="q-ml-sm text-weight-medium"></span>
        </q-toolbar-title>


        <!-- menu pre usera  -->
        <div v-if="user.isLogged" class="row items-center q-gutter-sm">
          <q-badge color="primary">
            {{ user.fullName }} ({{ user.me?.nickname }})
          </q-badge>
          <q-btn dense flat icon="logout" @click="(user.logout(), $router.push('/'))" />
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


          <!--menu pre pre vypis commandov-->
          <q-btn dense flat icon="info">
            <q-menu
              anchor="bottom right"
              self="top right"
              transition-show="slide-down"
              transition-hide="slide-up"
              class="glass top-nav-menu"
              :offset="[0, 8]"
            >
              <q-list padding>
                <q-item clickable v-close-popup>
                  <q-item-section>/join -> create channel</q-item-section>
                </q-item>
                <q-item clickable v-close-popup>
                  <q-item-section>/invite nickName -> invite do channel</q-item-section>
                </q-item>
                <q-item clickable v-close-popup>
                  <q-item-section>/revoke nickName -> odobranie usera z private channel</q-item-section>
                </q-item>
                <q-item clickable v-close-popup>
                  <q-item-section>/kick nickName -> treba 3 kick na odstranenie usera</q-item-section>
                </q-item>
                <q-item clickable v-close-popup>
                  <q-item-section>/quit -> admin vymaze kanal</q-item-section>
                </q-item>
                <q-item clickable v-close-popup>
                  <q-item-section>/cancel -> user opusti kanal</q-item-section>
                </q-item>
                <q-item clickable v-close-popup>
                  <q-item-section>/list -> list pouzivatelov</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div >
      </q-toolbar>
    </q-header>



    <q-page-container class="page-fit" >
      <router-view />
    </q-page-container>

    <q-footer class="command-footer" v-if="!$route.meta.hideFooter">
      <div class="command-bar glass">
        <q-form class="w-full">
          <GlobalCommandBar
            v-model="command"
            @submit="onGlobalSubmit"
          />
        </q-form>
      </div>
    </q-footer>




  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from 'src/stores/user'
import { useAppStore } from 'src/stores/app'
import { useChannelsStore } from 'src/stores/channels'
import GlobalCommandBar from 'components/GlobalCommandBar.vue'
import { emitCommandSubmit } from 'src/utils/cmdBus'

const app = useAppStore()
const user = useUserStore()
const command = ref('')

onMounted(() => user.loadSession())


const channels = useChannelsStore()
onMounted(() => { channels.cleanupStaleChannels() })

// odoslanie z globalneho command baru ide cez event bus do aktualnej stranky
function onGlobalSubmit(text: string) {
  const payload = (text ?? '').trim()
  if (!payload) return
  emitCommandSubmit(payload)
  command.value = ''
}
</script>


<style lang="scss">
:root {
  --header-h: 78px;
  --footer-h: 68px;
}

html, body, #q-app {
  height: 100%;
  overflow: hidden;
}


.glass {
  background: rgba(10, 18, 38, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.06);
}


.top-nav-menu {
  width: clamp(280px, 60vw, 440px);
  max-height: 70vh;
  overflow: auto;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.35);
}
</style>

<style lang="scss" scoped>
.toolbar-xl .q-toolbar {
  min-height: var(--header-h);
}
.q-toolbar-title span { letter-spacing: .2px; }

.page-fit {
  height: calc(100vh - var(--header-h) - var(--footer-h));
  overflow: hidden; /* KEEP ONE-SCREEN LOOK */
}

.command-footer {
  height: var(--footer-h);
  background: transparent;
  padding: 8px 14px;
  display: flex;
  align-items: center;
}
.command-bar {
  margin: 0 auto;
  width: min(1100px, 96vw);
  border-radius: 14px;
  padding: 6px 8px;

}

.command-input-field :deep(.q-field__control) {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  transition: box-shadow .18s ease, border-color .18s ease, background .18s ease;
}
.command-input-field :deep(.q-field__native) {
  padding-top: 8px;
  padding-bottom: 8px;
}
.command-input-field :deep(.q-field__control:focus-within) {
  border-color: #4aa3ff;
  box-shadow: 0 0 0 2px rgba(74,163,255,0.25);
  background: rgba(255,255,255,0.06);
}
.command-input-field :deep(.q-field__prepend .q-icon) {
  opacity: .9;
}

.app-bg {
  position: relative;
  min-height: 100vh;
  color: #d7dbe7;

  background:
    radial-gradient(1000px 600px at 8% 100%, rgba(41, 86, 160, 0.30) 0%, rgba(41, 86, 160, 0) 60%),
    radial-gradient(900px 500px at 88% 0%, rgba(25, 62, 120, 0.25) 0%, rgba(25, 62, 120, 0) 60%),
    linear-gradient(180deg, #0b1630 0%, #081226 35%, #060f1f 100%);
}

.app-bg::before {
  content: "";
  position: fixed;
  left: -12vw;
  bottom: -18vh;
  width: 60vw;
  height: 60vh;
  background: radial-gradient(50% 50% at 50% 50%, rgba(64, 130, 220, 0.22) 0%, rgba(64, 130, 220, 0) 70%);
  filter: blur(26px);
  pointer-events: none;
  z-index: 0;
}

.app-bg::after {
  content: "";
  position: fixed;
  top: 0;
  bottom: 0;
  left: 3vw;
  width: clamp(220px, 24vw, 360px);
  background: url('src/assets/e_bison.png') left bottom no-repeat;
  background-size: contain;
  opacity: 0.08;
  pointer-events: none;
  z-index: 0;
}

.q-page-container, .q-header, .q-footer {
  position: relative;
  z-index: 1;
}
</style>

