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
         <DialogOverlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />

         <DialogContent
            class="border-stroke bg-card font-label text-ink fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-4 shadow-xl focus:outline-none"
            :disable-outside-pointer-events="true"
            @escape-key-down.prevent="cancel"
            @pointer-down-outside.prevent
         >
            <DialogTitle class="text-ink text-base font-semibold">
               {{ options?.title }}
            </DialogTitle>

            <DialogDescription class="text-muted mt-2 text-xs leading-relaxed">
               {{ options?.description }}
            </DialogDescription>

            <div class="mt-4 space-y-4">
               <div class="relative w-full">
                  <input
                     class="border-stroke bg-bg text-ink placeholder:text-muted/60 focus:border-highlight focus:ring-tertiary w-full rounded-md border px-3 py-2 pr-14 text-sm transition-colors outline-none focus:ring-1"
                     @keydown.enter.prevent="submit(input)"
                     v-model="input"
                     type="text"
                     :placeholder="options?.placeholder || 'Enter your input...'"
                     maxlength="67"
                  />

                  <span
                     class="text-muted pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-xs"
                  >
                     {{ input.length || 0 }}/67
                  </span>
               </div>
               <div class="flex justify-end gap-2">
                  <button
                     class="text-muted hover:text-ink rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                     @click="cancel"
                     type="button"
                  >
                     Cancel
                  </button>
                  <button
                     class="bg-highlight text-card rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
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
