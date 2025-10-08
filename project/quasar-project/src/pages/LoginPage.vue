<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from 'src/stores/user'
import { Notify } from 'quasar'

const router = useRouter()
const user = useUserStore()

const identifier = ref('')
const password = ref('')
const loading = ref(false)
const r = { required: (v: string) => !!v || 'Required' }

function onSubmit() {
  try {
    loading.value = true
    user.login(identifier.value, password.value)
    void router.push('/')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Login failed'
    Notify.create({ type: 'negative', message: msg })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <q-page class="q-pa-xl flex flex-center">
    <q-card flat bordered class="q-pa-lg" style="width: 420px; max-width: 95vw;">
      <div class="text-h6 q-mb-md">Login</div>
      <q-form @submit.prevent="onSubmit" class="q-gutter-md">
        <q-input v-model="identifier" label="Email or Nickname" filled :rules="[r.required]" />
        <q-input v-model="password"   label="Password" type="password" filled :rules="[r.required]" />
        <q-btn type="submit" color="primary" label="Login" class="full-width" :loading="loading" />
        <q-btn flat label="Create account" class="full-width" @click="$router.push('/register')" />
      </q-form>
    </q-card>
  </q-page>
</template>
