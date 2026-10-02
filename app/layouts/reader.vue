<template>
   <div>
      <UHeader :toggle="false" class="bg-default border-default">
         <template #left>
            <UButton color="neutral" variant="ghost" icon="lucide:arrow-left" @click="navigateTo('/')" />

            <TableOfContent />
         </template>

         <template #right>
            <UColorModeButton color="neutral" />
         </template>
      </UHeader>

      <UMain class="bg-muted">
         <UContainer>
            <slot />
         </UContainer>
      </UMain>

      <footer class="text-sm fixed bottom-0 right-0 p-2 z-100">
         <p class="inline">{{ readerStore.charactersRead }} / {{ readerStore.characters }} -</p>
         <p class="inline">{{ readerStore.progress.toFixed(2) }}%</p>
      </footer>
   </div>
</template>

<script lang="ts" setup>
const readerStore = useReaderStore();

/* *** */
</script>

<style scoped></style>
