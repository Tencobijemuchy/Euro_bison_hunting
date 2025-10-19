<template>
  <q-dialog v-model="model">
    <q-card style="min-width:340px">
      <q-card-section class="text-subtitle1">Members of #{{ channel }}</q-card-section>
      <q-separator />
      <q-list bordered>
        <q-item v-for="m in members" :key="m.nick">
          <q-item-section>
            <q-item-label>@{{ m.nick }}</q-item-label>
            <q-item-label caption>{{ m.status }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
      <q-card-actions align="right">
        <q-btn flat label="Close" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
defineProps<{ channel: string; members: { nick: string; status: string }[] }>()
const model = defineModel<boolean>({ required: true })
</script>
