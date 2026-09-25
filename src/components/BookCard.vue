<template>
   <article
      :class="[
         columnClassMap[props.columns],
         'grid w-full rounded-md border border-(--card-border) bg-(--card) p-2 shadow-sm md:p-4',
      ]"
   >
      <div class="flex h-full w-full items-center justify-center overflow-hidden">
         <slot name="image" />
      </div>

      <div class="h-full w-full min-w-0 overflow-hidden">
         <slot name="metadata" />
      </div>
   </article>
</template>

<script setup lang="ts">
const props = withDefaults(
   defineProps<{
      columns?: '1fr_2fr' | '1fr_1fr' | '1fr_3fr';
   }>(),
   {
      columns: '1fr_2fr',
   }
);

const columnClassMap = {
   '1fr_2fr': 'grid-cols-[1fr_2fr]',
   '1fr_1fr': 'grid-cols-[1fr_1fr]',
   '1fr_3fr': 'grid-cols-[1fr_3fr]',
} as const;
</script>

<style scoped>
:global(html) {
   --card: #f6f2e6;
   --card-border: #ded6c5;
}

:global(html.dark) {
   --card: #15181a;
   --card-border: #2e353c;
}
</style>
