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
import { ref, watch } from 'vue'
import { useChannelsStore } from 'src/stores/channels'
import { useRoute } from 'vue-router'

const props = defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'submit', text: string): void
}>()

const cmd = ref(props.modelValue ?? '')

const channels = useChannelsStore()
const route = useRoute()
const channelName = String(route.params.channelName || '')

// synchronizácia modelValue -> cmd
watch(() => props.modelValue, (v) => {
  if (v !== undefined && v !== cmd.value) cmd.value = v
})

// pri zmene textu:
watch(cmd, (v) => {
  emit('update:modelValue', v)

  if (channelName) {
    channels.broadcastDraft(channelName, v)
  }
})

function run() {
  const raw = cmd.value.trim()
  if (!raw) return
  emit('submit', raw)
  cmd.value = ''
  channels.broadcastDraft(channelName, '')
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
