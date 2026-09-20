<script setup lang="ts">
import { DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';
import { ListboxContent, ListboxItem, ListboxRoot } from 'reka-ui';
import { active, options, selections, useSelect } from '@src/composables/useSelect';

const { confirm, cancel } = useSelect();

const { to } = defineProps<{
   to: string;
}>();
</script>

<template>
   <DialogRoot v-model:open="active">
      <DialogPortal :to="to">
         <DialogOverlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />

         <DialogContent
            class="border-stroke bg-card font-label text-ink fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-5 shadow-xl focus:outline-none"
            @pointer-down-outside.prevent
            :disable-outside-pointer-events="true"
            @escape-key-down.prevent="cancel"
         >
            <DialogTitle class="text-ink text-base font-semibold"> {{ options.title ?? 'Select' }}</DialogTitle>

            <DialogDescription class="text-muted mt-2 text-xs leading-relaxed">
               {{ options.description ?? 'Choose one option below' }}
            </DialogDescription>

            <ListboxRoot class="py-4" :orientation="'vertical'" :highlight-on-hover="true" :required="true">
               <ListboxContent class="themed-scroll max-h-56 w-full overflow-y-auto">
                  <ListboxItem
                     class="text-ink data-highlighted:bg-highlight/10 data-highlighted:text-ink data-[state=checked]:text-ink focus-visible:bg-highlight/10 focus-visible:text-ink relative flex cursor-pointer items-center justify-between truncate px-3 py-2 pr-4 text-sm transition-colors outline-none select-none data-[state=checked]:font-medium"
                     v-for="selection in selections"
                     :key="selection.id"
                     :value="selection.value"
                     @select.prevent="confirm(selection)"
                  >
                     {{ selection.value }}
                  </ListboxItem>
               </ListboxContent>
            </ListboxRoot>

            <button
               type="button"
               class="bg-highlight text-card ml-auto block rounded-md px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90"
               @click="cancel"
            >
               Cancel
            </button>
         </DialogContent>
      </DialogPortal>
   </DialogRoot>
</template>
