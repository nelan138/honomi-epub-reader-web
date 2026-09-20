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
         <AlertDialogOverlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />

         <AlertDialogContent
            class="border-stroke bg-card font-label text-ink fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-5 shadow-xl focus:outline-none"
            :disable-outside-pointer-events="true"
            @keydown.enter.prevent="confirm"
            @escape-key-down.prevent="cancel"
         >
            <AlertDialogTitle class="text-ink text-base font-semibold">
               {{ options?.title || 'Confirm Action' }}
            </AlertDialogTitle>

            <AlertDialogDescription class="text-muted mt-2 text-xs leading-relaxed">
               {{ options?.description || 'This action cannot be undone. Are you sure you want to proceed?' }}
            </AlertDialogDescription>

            <div class="mt-6 flex justify-end gap-2">
               <AlertDialogCancel
                  class="text-muted hover:text-ink rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                  @click.prevent="cancel"
               >
                  {{ options?.cancelText || 'Cancel' }}
               </AlertDialogCancel>

               <AlertDialogAction
                  class="bg-highlight text-card rounded-md px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90"
                  @click.prevent="confirm"
               >
                  {{ options?.confirmText || 'Confirm' }}
               </AlertDialogAction>
            </div>
         </AlertDialogContent>
      </AlertDialogPortal>
   </AlertDialogRoot>
</template>
