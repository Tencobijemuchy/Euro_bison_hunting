<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from 'stores/user'
import { Notify } from 'quasar'

const router = useRouter()
const user = useUserStore()

const loading = ref(false)

// Formulárové dáta
const form = reactive({
  firstName: '',
  lastName: '',
  nickname: '',
  email: '',
  password: ''
})

// Validačné pravidlá
const rules = {
  required: (val: string) => !!val || 'Field is required',
  email: (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Invalid email',
  nickname: (val: string) => val.length >= 3 || 'Nickname must be at least 3 characters',
  min6: (val: string) => val.length >= 6 || 'Password must be at least 6 characters'
}

const onSubmit = async () => {
  try {
    loading.value = true
    await user.register({ ...form })
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
  <q-page class="auth-page q-pa-xl flex items-start justify-center">
    <q-card flat class="glass auth-card q-pa-lg">
      <div class="row items-center q-gutter-sm q-mb-md">
        <q-avatar square size="80px" class="bg-transparent">
          <img src="src/assets/e_bison.png" alt="e-Bison logo" />
        </q-avatar>
      </div>

      <q-form @submit.prevent="onSubmit" class="q-gutter-md">
        <q-input
          v-model="form.firstName"
          label="First name"
          :rules="[rules.required]"
          outlined
          class="is-dark-field"
        >
          <template #prepend><q-icon name="badge" /></template>
        </q-input>

        <q-input
          v-model="form.lastName"
          label="Last name"
          :rules="[rules.required]"
          outlined
          class="is-dark-field"
        >
          <template #prepend><q-icon name="badge" /></template>
        </q-input>

        <q-input
          v-model="form.nickname"
          label="Nickname"
          :rules="[rules.required, rules.nickname]"
          outlined
          class="is-dark-field"
        >
          <template #prepend><q-icon name="tag" /></template>
        </q-input>

        <q-input
          v-model="form.email"
          label="Email"
          :rules="[rules.required, rules.email]"
          outlined
          class="is-dark-field"
        >
          <template #prepend><q-icon name="mail" /></template>
        </q-input>

        <q-input
          v-model="form.password"
          label="Password"
          :rules="[rules.required, rules.min6]"
          type="password"
          outlined
          class="is-dark-field"
        >
          <template #prepend><q-icon name="lock" /></template>
        </q-input>

        <div class="row justify-center">
          <div class="col-md-12">
            <q-btn
              type="submit"
              color="primary"
              label="Create account"
              class="full-width"
              :loading="loading"
            />
          </div>
        </div>

        <q-separator spaced />
        <div class="row justify-center">
          <div class="col-md-12">
            <q-btn
              flat
              label="I have an account – Login"
              class="full-width"
              @click="router.push('/login')"
            />
          </div>
        </div>
      </q-form>
    </q-card>
  </q-page>
</template>

<style scoped>
.auth-card {
  width: 800px;
  max-width: 95vw;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,.35);
}

.is-dark-field :deep(.q-field__control) {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  transition: box-shadow .18s ease, border-color .18s ease, background .18s ease;
}

.is-dark-field :deep(.q-field__control:focus-within) {
  border-color: #4aa3ff;
  box-shadow: 0 0 0 2px rgba(74,163,255,0.25);
  background: rgba(255,255,255,0.06);
}

@media (max-width: 1500px) {
  .auth-page { padding-top: 16px; }
}

.auth-page {
  height: 100%;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  padding-top: 0px;
  padding-bottom: calc(
    var(--footer-h, 68px) + var(--footer-lift, 0px) + env(safe-area-inset-bottom) + 24px
  );
}
</style>
