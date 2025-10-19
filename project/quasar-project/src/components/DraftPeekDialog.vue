<template>
  <q-card style="min-width: 420px">
    <q-card-section class="text-subtitle1">
      {{ nickname }} — current draft
    </q-card-section>
    <q-separator />
    <q-card-section>
      <pre class="q-pa-sm bg-grey-2" style="white-space: pre-wrap">{{ text || '— empty —' }}</pre>
    </q-card-section>
    <q-card-actions align="right">
      <q-btn flat label="Close" v-close-popup />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
defineProps<{ nickname: string; text: string }>()
</script>
