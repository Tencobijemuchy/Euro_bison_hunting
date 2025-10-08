<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>Slack-lite (UI prototype)</q-toolbar-title>

        <!-- SIMPLE NAV MENUCKO -->
        <q-btn dense flat label="Home" @click="$router.push('/')" />
        <q-btn dense flat label="Login" @click="$router.push('/login')" />
        <q-btn dense flat label="Register" @click="$router.push('/register')" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">

</script>
