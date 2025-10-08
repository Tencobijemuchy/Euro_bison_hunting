<template>
  <q-page class="q-pa-xl flex flex-center">
    <q-card flat bordered class="q-pa-lg" style="width: 420px; max-width: 95vw;">
      <div class="text-h6 q-mb-md">Register</div>

      <q-form @submit.prevent="onSubmit" class="q-gutter-md">
        <q-input v-model="form.firstName" label="First name" filled />
        <q-input v-model="form.lastName"  label="Last name"  filled />
        <q-input v-model="form.nickname"  label="Nickname"   filled />
        <q-input v-model="form.email"     label="Email"      filled />
        <q-input v-model="form.password"  label="Password"   type="password" filled />
        <q-btn type="submit" color="primary" label="Create account" class="full-width" />
        <q-btn flat label="I have an account – Login" class="full-width" @click="$router.push('/login')" />
      </q-form>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

const form = reactive({
  firstName: '',
  lastName: '',
  nickname: '',
  email: '',
  password: ''
})

function onSubmit () {

  
}
</script>
