<template>
   <DialogRoot v-model:open="active">
      <DialogPortal :to="to">
         <DialogOverlay class="fixed inset-0 z-100 bg-(--prompt-overlay) backdrop-blur-xs" />

         <DialogContent
            class="fixed top-1/2 left-1/2 z-150 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-(--prompt-border) bg-(--prompt-bg) p-4 shadow-xl focus:outline-none"
            :disable-outside-pointer-events="true"
            @escape-key-down.prevent="cancel"
            @pointer-down-outside.prevent
         >
            <DialogTitle class="text-base font-semibold">
               {{ options?.title }}
            </DialogTitle>

            <DialogDescription class="mt-2 text-xs leading-relaxed">
               {{ options?.description }}
            </DialogDescription>

            <div class="mt-4 space-y-4">
               <div class="relative w-full">
                  <input
                     class="w-full rounded-md border border-(--input-border) bg-(--input-bg) px-3 py-2 pr-14 text-sm transition-colors outline-none focus:ring-1"
                     @keydown.enter.prevent="submit(input)"
                     v-model="input"
                     type="text"
                     :placeholder="options?.placeholder || 'Enter your input...'"
                     maxlength="67"
                  />

                  <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs">
                     {{ input.length || 0 }}/67
                  </span>
               </div>
               <div class="flex justify-end gap-2">
                  <button
                     class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                     @click="cancel"
                     type="button"
                  >
                     Cancel
                  </button>
                  <button
                     class="text-card rounded-md bg-(--prompt-submit-btn-bg) px-3 py-1.5 text-xs font-medium text-(--prompt-submit-btn-text) transition-opacity hover:opacity-90"
                     @click="submit(input)"
                     type="button"
                  >
                     Submit
                  </button>
               </div>
            </div>
         </DialogContent>
      </DialogPortal>
   </DialogRoot>
</template>

<script lang="ts" setup>
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, DialogDescription } from 'reka-ui';
import { active, options, usePrompt } from '@src/composables/usePrompt';

/* *** */

const { cancel, submit } = usePrompt();

const input = ref('');

const { to } = defineProps<{
   to: string;
}>();

watch(active, (value) => {
   // open modal
   if (value === true) {
      input.value = options.value?.defaultValue ?? '';
   } else {
      input.value = '';
   }
});
</script>

<style lang="css" scoped>
:global(html) {
   --prompt-overlay: rgb(43 38 32 / 0.45);
   --prompt-bg: #faf7f0;
   --prompt-border: #ded6c5;
   --input-bg: #f2ebe0;
   --input-border: #d4caa8;
   --prompt-submit-btn-bg: #8c6d46;
   --prompt-submit-btn-text: #fbf9f4;
}

:global(html.dark) {
   --prompt-overlay: rgb(10 12 14 / 0.7);
   --prompt-bg: #1a1e22;
   --prompt-border: #2e353c;
   --input-bg: #15181a;
   --input-border: #38414a;
   --prompt-submit-btn-bg: #d4a373;
   --prompt-submit-btn-text: #15181a;
}
</style>
