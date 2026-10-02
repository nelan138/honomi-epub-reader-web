```vue
<template>
   <USlideover side="left" :close="true" :overlay="false">
      <UButton color="neutral" variant="ghost" icon="lucide:list" />

      <template #content>
         <nav>
            <ul class="flex flex-col h-full">
               <li v-for="item in readerStore.navigation" :key="item.href">
                  <a :href="item.href" class="flex items-center px-4 py-3 text-lg text-default hover:bg-muted">
                     {{ item.label }}
                  </a>
               </li>
            </ul>
         </nav>
      </template>
   </USlideover>
</template>

<script lang="ts" setup>
const readerStore = useReaderStore();

/* *** */
</script>

<style scoped></style>
```
