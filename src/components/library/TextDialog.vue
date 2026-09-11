<script lang="ts" setup>
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';
import { ref } from 'vue';

const open = defineModel<boolean>('open', { required: true });
const input = ref<string>('');

const { title } = defineProps<{
   title?: string;
}>();

const emit = defineEmits<{
   submit: [input: string];
   cancel: [input: string];
}>();

const onCancel = () => {
   input.value = '';
   emit('cancel', '');
};

const onSubmit = () => {
   emit('submit', input.value);
   input.value = '';
};
</script>

<template>
   <DialogRoot v-model:open="open">
      <DialogPortal>
         <DialogOverlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />

         <DialogContent
            @escape-key-down="onCancel"
            @open-auto-focus=""
            class="border-stroke bg-card font-label text-ink fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-5 shadow-xl focus:outline-none"
         >
            <DialogTitle class="text-ink text-sm font-semibold"> {{ title || 'Popup' }} </DialogTitle>

            <form @submit.prevent="onSubmit" class="mt-4 space-y-4">
               <div class="relative w-full">
                  <input
                     v-model.lazy.trim="input"
                     type="text"
                     placeholder="Type a name..."
                     class="border-stroke bg-bg text-ink placeholder:text-muted/60 focus:border-highlight focus:ring-tertiary w-full rounded-md border px-3 py-2 text-sm transition-colors outline-none focus:ring-1"
                  />
               </div>

               <div class="flex justify-end gap-2">
                  <DialogClose
                     @click="onCancel"
                     type="button"
                     class="text-muted hover:text-ink rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                  >
                     Cancel
                  </DialogClose>

                  <button
                     @click="onSubmit"
                     type="submit"
                     class="bg-highlight text-card rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
                  >
                     Confirm
                  </button>
               </div>
            </form>
         </DialogContent>
      </DialogPortal>
   </DialogRoot>
</template>
