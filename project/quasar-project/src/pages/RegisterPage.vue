<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from 'src/stores/user'
import { Notify } from 'quasar'

const router = useRouter()
const user = useUserStore()
const loading = ref(false)

const form = reactive({
  firstName: '',
  lastName: '',
  nickname: '',
  email: '',
  password: '',
})

const r = {
  required: (v: string) => !!v || 'Required',
  email: (v: string) => /.+@.+\..+/.test(v) || 'Invalid email',
  min6: (v: string) => (v?.length ?? 0) >= 6 || 'Min 6 characters',
  nickname: (v: string) => /^[a-zA-Z0-9_.-]{3,20}$/.test(v) || '3–20 letters/digits/._-',
}

function onSubmit() {
  try {
    loading.value = true
    user.register({ ...form })
    void router.push('/')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Registration failed'
    Notify.create({ type: 'negative', message: msg })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <q-page class="q-pa-xl flex flex-center">
    <q-card flat bordered class="q-pa-lg" style="width: 420px; max-width: 95vw;">
      <div class="text-h6 q-mb-md">Register</div>
      <q-form @submit.prevent="onSubmit" class="q-gutter-md">
        <q-input v-model="form.firstName" label="First name" filled :rules="[r.required]" />
        <q-input v-model="form.lastName"  label="Last name"  filled :rules="[r.required]" />
        <q-input v-model="form.nickname"  label="Nickname"   filled :rules="[r.required, r.nickname]" />
        <q-input v-model="form.email"     label="Email"      filled :rules="[r.required, r.email]" />
        <q-input v-model="form.password"  label="Password"   type="password" filled :rules="[r.required, r.min6]" />
        <q-btn type="submit" color="primary" label="Create account" class="full-width" :loading="loading" />
        <q-btn flat label="I have an account – Login" class="full-width" @click="$router.push('/login')" />
      </q-form>
    </q-card>
  </q-page>
</template>
