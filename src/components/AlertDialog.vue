<script lang="ts" setup>
import {
   AlertDialogRoot,
   AlertDialogPortal,
   AlertDialogOverlay,
   AlertDialogContent,
   AlertDialogTitle,
   AlertDialogDescription,
   AlertDialogCancel,
   AlertDialogAction,
} from 'reka-ui';
import { active, options, useAlert } from '@src/composables/useAlert';
const { confirm, cancel } = useAlert();

defineProps<{
   to: string;
}>();
</script>

<template>
   <AlertDialogRoot v-model:open="active">
      <AlertDialogPortal :to="to">
         <AlertDialogOverlay class="fixed inset-0 z-50 bg-(--alert-overlay) backdrop-blur-xs" />

         <AlertDialogContent
            class="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-(--alert-border) bg-(--alert-bg) p-4 shadow-xl focus:outline-none"
            :disable-outside-pointer-events="true"
            @keydown.enter.prevent="confirm"
            @escape-key-down.prevent="cancel"
         >
            <AlertDialogTitle class="text-base">
               {{ options?.title || 'Confirm Action' }}
            </AlertDialogTitle>

            <AlertDialogDescription class="mt-2 text-xs leading-relaxed">
               {{ options?.description || 'This action cannot be undone. Are you sure you want to proceed?' }}
            </AlertDialogDescription>

            <div class="mt-6 flex justify-end gap-2">
               <AlertDialogCancel
                  class="rounded-md px-3 py-1.5 text-sm font-medium text-(--alert-cancel-btn-text) transition-colors"
                  @click.prevent="cancel"
               >
                  {{ options?.cancelText || 'Cancel' }}
               </AlertDialogCancel>

               <AlertDialogAction
                  class="rounded-md bg-(--alert-confirm-btn-bg) px-3 py-1.5 text-sm font-medium text-(--alert-confirm-btn-text) transition-opacity hover:opacity-90"
                  @click.prevent="confirm"
               >
                  {{ options?.confirmText || 'Confirm' }}
               </AlertDialogAction>
            </div>
         </AlertDialogContent>
      </AlertDialogPortal>
   </AlertDialogRoot>
</template>

<style lang="css" scoped>
:global(html) {
   --alert-overlay: rgb(43 38 32 / 0.45);
   --alert-bg: #faf7f0;
   --alert-border: #ded6c5;

   --alert-cancel-btn-text: #5a4f43;

   --alert-confirm-btn-bg: #b94a3e;
   --alert-confirm-btn-text: #ffffff;
}

:global(html.dark) {
   --alert-overlay: rgb(10 12 14 / 0.7);
   --alert-bg: #1a1e22;
   --alert-border: #2e353c;

   --alert-cancel-btn-text: #9da7b0;

   --alert-confirm-btn-bg: #e06c5f;
   --alert-confirm-btn-text: #15181a;
}
</style>
