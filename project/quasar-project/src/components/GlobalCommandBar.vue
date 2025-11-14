<template>
  <!--  command bar s inputom a cudlikom send -->
  <div class="w-full q-pa-sm row no-wrap  q-gutter-sm command-bar">
    <div class="col">
      <q-input
        v-model="cmd"
        dense
        outlined
        rounded
        clearable
        class="command-input-field"
        @keyup.enter="run"
      />
    </div>

    <div class="col-auto send_btn">
      <q-btn
        dense
        :flat="false"
        color="primary"
        round
        icon="send"
        aria-label="Send"
        @click="run"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

/* stav pola - aktualny text prikazu/spravy */
const cmd = ref('')
const emit = defineEmits<{ (e: 'submit', text: string): void }>()

/*odosle text a vycisti input field*/
function run() {
  const raw = cmd.value.trim()
  if (!raw) return
  emit('submit', raw)
  cmd.value = ''
}
</script>

<style scoped>
.command-bar {
  background: transparent !important;
  border-top: none !important;
  box-shadow: none !important;
  gap: 20px !important;
}


.command-input-field {
  min-width: 0;
  width: 100%;
}

.command-input-field :deep(.q-field__control) {
  background: transparent;
  border-radius: 24px;
  transition: box-shadow .18s ease, border-color .18s ease, background .18s ease;
}

.command-input-field :deep(.q-field__control:focus-within) {
  border-color: #4aa3ff;
  background: transparent;
  min-width: 0;
}

.command-input-field :deep(.q-field__native) {
  font-size: 1.5rem;
}

.command-input-field :deep(.q-icon) {
  font-size: 20px;
}

.send_btn {
  flex: 0 0 auto;
  margin-right: calc(var(--cmdbar-px, 12px) - 4px);
}

@media (max-width: 599px) {
  .command-bar { gap: 10px !important; }
  .command-input-field :deep(.q-field__native) { font-size: 1.125rem; }
}
</style>
