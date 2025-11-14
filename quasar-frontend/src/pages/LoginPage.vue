<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from 'stores/user'
import { Notify } from 'quasar'

const router = useRouter()
const user = useUserStore()

const identifier = ref('')
const password = ref('')
const loading = ref(false)

// Validačné pravidlá
const rules = {
  required: (val: string) => !!val || 'Field is required'
}

const onSubmit = async () => {
  try {
    loading.value = true
    await user.login(identifier.value, password.value)
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
  <q-page class="auth-page q-pa-xl flex items-start justify-center">
    <q-card flat class="glass auth-card q-pa-lg">
      <div class="row items-center q-gutter-sm q-mb-md">
        <q-avatar square size="80px" class="bg-transparent">
          <img src="src/assets/e_bison.png" alt="e-Bison logo" />
        </q-avatar>
      </div>

      <q-form @submit.prevent="onSubmit" class="q-gutter-md big-inputs">
        <q-input
          v-model="identifier"
          label="Email or Nickname"
          outlined
          :rules="[rules.required]"
          class="is-dark-field"
        >
          <template #prepend><q-icon name="person" /></template>
        </q-input>

        <q-input
          v-model="password"
          label="Password"
          type="password"
          outlined
          :rules="[rules.required]"
          class="is-dark-field"
        >
          <template #prepend><q-icon name="lock" /></template>
        </q-input>

        <div class="row justify-center">
          <div class="col-md-12">
            <q-btn
              type="submit"
              color="primary"
              label="Login"
              :loading="loading"
              class="full-width"
            />
          </div>
        </div>

        <q-separator spaced />
        <div class="row justify-center">
          <div class="col-md-12">
            <q-btn
              flat
              label="Create account"
              class="full-width"
              @click="router.push('/register')"
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

.auth-page {
  height: 100%;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(
    var(--footer-h, 68px) + var(--footer-lift, 0px) + env(safe-area-inset-bottom) + 24px
  );
}
</style>
