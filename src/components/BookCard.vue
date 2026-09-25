<template>
   <article
      class="grid w-full grid-cols-[1fr_2fr] rounded-md border border-(--card-border) bg-(--card) p-2 shadow-sm md:p-4"
   >
      <div class="flex h-full w-full items-center justify-center overflow-hidden">
         <slot name="image" />
      </div>

      <div class="h-full w-full min-w-0 overflow-hidden">
         <div class="flex h-full flex-col gap-4 pl-4">
            <div class="flex min-w-0 flex-1 flex-col font-serif md:gap-2 md:text-[100%]">
               <slot name="metadata" />
            </div>

            <slot name="progress-bar" />

            <div @click.stop class="flex justify-end gap-4 md:gap-8 lg:justify-around lg:gap-2">
               <slot name="actions" />
            </div>
         </div>
      </div>
   </article>
</template>

<script setup lang="ts"></script>

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
