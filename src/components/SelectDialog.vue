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
         <DialogOverlay class="fixed inset-0 z-50 bg-(--select-overlay) backdrop-blur-xs" />

         <DialogContent
            class="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-(--select-border) bg-(--select-bg) p-4 shadow-xl focus:outline-none"
            @pointer-down-outside.prevent
            :disable-outside-pointer-events="true"
            @escape-key-down.prevent="cancel"
         >
            <DialogTitle class="text-base font-semibold"> {{ options.title ?? 'Select' }}</DialogTitle>

            <DialogDescription class="mt-2 text-xs leading-relaxed">
               {{ options.description ?? 'Choose one option below' }}
            </DialogDescription>

            <ListboxRoot class="py-4" :orientation="'vertical'" :highlight-on-hover="true" :required="true">
               <ListboxContent class="themed-scroll max-h-56 w-full overflow-y-auto">
                  <ListboxItem
                     v-for="selection in selections"
                     :key="selection.id"
                     :value="selection.value"
                     @select.prevent="confirm(selection)"
                     class="relative flex cursor-pointer items-center justify-between truncate bg-(--item-bg) px-3 py-2 pr-4 text-sm text-(--item-text) transition-colors outline-none select-none focus-visible:bg-(--selected-item-bg) focus-visible:text-(--selected-item-text) data-highlighted:bg-(--selected-item-bg) data-highlighted:text-(--selected-item-text) data-[state=checked]:bg-(--selected-item-bg) data-[state=checked]:font-medium data-[state=checked]:text-(--selected-item-text)"
                  >
                     {{ selection.value }}
                  </ListboxItem>
               </ListboxContent>
            </ListboxRoot>

            <button
               type="button"
               class="ml-auto block rounded-md bg-(--select-cancel-btn-bg) px-3 py-1.5 text-sm font-medium text-(--select-cancel-btn-text) transition-opacity hover:opacity-90"
               @click="cancel"
            >
               Cancel
            </button>
         </DialogContent>
      </DialogPortal>
   </DialogRoot>
</template>

<style lang="css" scoped>
:global(html) {
   --select-overlay: rgb(43 38 32 / 0.45);
   --select-bg: #faf7f0;
   --select-border: #ded6c5;

   --select-cancel-btn-bg: transparent;
   --select-cancel-btn-text: #5a4f43;

   --item-text: #2b2620;
   --selected-item-text: #8c6d46;
   --item-bg: transparent;
   --selected-item-bg: #efe8da;
}

:global(html.dark) {
   --select-overlay: rgb(10 12 14 / 0.7);
   --select-bg: #1a1e22;
   --select-border: #2e353c;

   --select-cancel-btn-bg: transparent;
   --select-cancel-btn-text: #9da7b0;

   --item-text: #e6edf3;
   --selected-item-text: #d4a373;
   --item-bg: transparent;
   --selected-item-bg: #242a30;
}
</style>
