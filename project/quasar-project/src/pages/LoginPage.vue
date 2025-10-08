<template>
  <q-page class="q-pa-xl flex flex-center">
    <q-card flat bordered class="q-pa-lg" style="width: 420px; max-width: 95vw;">
      <div class="text-h6 q-mb-md">Login</div>

      <q-form @submit.prevent="onSubmit" class="q-gutter-md">
        <q-input v-model="identifier" label="Email or Nickname" filled />
        <q-input v-model="password" label="Password" type="password" filled />
        <q-btn type="submit" color="primary" label="Login" class="full-width" />
        <q-btn flat label="Create account" class="full-width" @click="$router.push('/register')" />
      </q-form>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const identifier = ref('')
const password = ref('')

function onSubmit () {
  
}
</script>
