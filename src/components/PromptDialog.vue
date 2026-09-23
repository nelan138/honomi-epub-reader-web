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

<template>
   <DialogRoot v-model:open="active">
      <DialogPortal :to="to">
         <DialogOverlay class="fixed inset-0 z-50 bg-(--prompt-overlay) backdrop-blur-xs" />

         <DialogContent
            class="text-ink fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-(--prompt-border) bg-(--prompt-bg) p-4 shadow-xl focus:outline-none"
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

<style lang="css" scoped>
:global(html) {
   --prompt-overlay: rgb(15 23 42 / 0.4);
   --prompt-bg: #ffffff;
   --prompt-border: #e2e8f0;
   --input-bg: #f8fafc;
   --input-border: #cbd5e1;
   --prompt-submit-btn-bg: #2563eb;
   --prompt-submit-btn-text: #ffffff;
}

:global(html.dark) {
   --prompt-overlay: rgb(0 0 0 / 0.6);
   --prompt-bg: #1e293b;
   --prompt-border: #475569;
   --input-bg: #334155;
   --input-border: #64748b;
   --prompt-submit-btn-bg: #3b82f6;
   --prompt-submit-btn-text: #ffffff;
}
</style>
