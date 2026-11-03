<template>
   <UHeader v-if="headerIsOpen" :toggle="false" class="fixed top-0 w-full z-50 border-default">
      <template #left>
         <UButton color="neutral" variant="ghost" icon="lucide:arrow-left" @click="navigateTo('/')" />

         <ReaderToC />

         <UButton color="neutral" variant="ghost" icon="lucide:chevrons-up" @click="headerIsOpen = false" />
      </template>

      <template #right>
         <UColorModeButton color="neutral" />

         <ReaderSettings />
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
</template>

<script lang="ts" setup>
/* *** */

const headerIsOpen = ref(true);
</script>
