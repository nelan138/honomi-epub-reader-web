<template>
   <div>
      <UHeader v-if="headerIsOpen" :toggle="false" class="fixed top-0 w-full z-50 border-default">
         <template #left>
            <UButton color="neutral" variant="ghost" icon="lucide:arrow-left" @click="navigateTo('/')" />

            <TableOfContent />

            <UButton color="neutral" variant="ghost" icon="lucide:chevrons-up" @click="headerIsOpen = false" />
         </template>

         <template #right>
            <UColorModeButton color="neutral" />

            <SettingsPanel />
         </template>
      </UHeader>

      <header v-else class="fixed z-100 p-2">
         <UButton
            icon="lucide:chevrons-down"
            color="neutral"
            variant="link"
            class="text-default cursor-pointer"
            @click="headerIsOpen = true"
         />
      </header>

      <UMain class="bg-muted">
         <slot />
      </UMain>

      <footer v-if="settingsStore.progressDisplay !== 'none'" class="text-xs fixed bottom-0 right-0 p-2 z-100">
         <p v-if="settingsStore.progressDisplay === 'default'" class="inline">
            {{ readerStore.charactersRead }} / {{ readerStore.characters }} <span> - </span>
         </p>
         <p class="inline">{{ readerStore.progress.toFixed(2) }}%</p>
      </footer>
   </div>
</template>

<script lang="ts" setup>
const readerStore = useReaderStore();
const settingsStore = useSettingsStore();

/* *** */

const headerIsOpen = ref(true);
</script>

<style scoped></style>
