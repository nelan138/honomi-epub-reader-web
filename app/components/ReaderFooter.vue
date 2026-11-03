<template>
   <footer v-if="settingsStore.progressDisplay !== 'none'" class="text-xs fixed bottom-0 right-0 p-2 z-100">
      <p v-if="settingsStore.progressDisplay === 'default'" class="inline">
         {{ readerStore.charactersRead }} / {{ readerStore.characters }} <span> - </span>
      </p>
      <p class="inline">{{ readerStore.progress.toFixed(2) }}%</p>
   </footer>
</template>

<script lang="ts" setup>
const readerStore = useReaderStore();
const settingsStore = useSettingsStore();
</script>

<style></style>
