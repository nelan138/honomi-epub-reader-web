<script setup lang="ts">
import {
   DialogClose,
   DialogContent,
   DialogDescription,
   DialogOverlay,
   DialogPortal,
   DialogRoot,
   DialogTitle,
} from 'reka-ui';

const open = defineModel<boolean>('open', { required: true });

const { title, message } = defineProps<{
   title?: string;
   message?: string;
}>();

const emit = defineEmits<{
   confirm: [];
   cancel: [];
}>();
</script>

<template>
   <DialogRoot v-model:open="open">
      <DialogPortal>
         <DialogOverlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />

         <DialogContent
            @escape-key-down="emit('cancel')"
            @pointer-down-outside="emit('cancel')"
            @keydown.enter.prevent="emit('confirm')"
            class="border-stroke bg-card font-label text-ink fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-5 shadow-xl focus:outline-none"
         >
            <DialogTitle class="text-ink text-base font-semibold">
               {{ title || 'Confirm Action' }}
            </DialogTitle>

            <DialogDescription class="text-muted mt-2 text-sm leading-relaxed">
               {{ message || 'This action cannot be undone. Are you sure you want to proceed?' }}
            </DialogDescription>

            <div class="mt-6 flex justify-end gap-2">
               <DialogClose
                  @click="emit('cancel')"
                  type="button"
                  class="text-muted hover:text-ink rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
               >
                  Cancel
               </DialogClose>

               <button
                  @click="emit('confirm')"
                  type="button"
                  class="bg-highlight text-card rounded-md px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90"
               >
                  Confirm
               </button>
            </div>
         </DialogContent>
      </DialogPortal>
   </DialogRoot>
</template>
