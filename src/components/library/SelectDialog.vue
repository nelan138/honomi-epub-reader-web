<script lang="ts" setup>
import { UnexpectedRuntimeError } from '@src/types/errors';
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';
import { ListboxContent, ListboxItem, ListboxItemIndicator, ListboxRoot } from 'reka-ui';
import { ref } from 'vue';

type Option = {
   name: string;
   id: number;
};

const open = defineModel<boolean>('open', { required: true });
const selected = ref<number | null>(null);

const { title } = defineProps<{
   title?: string;
   options: Option[];
}>();

const emit = defineEmits<{
   select: [optionId: number];
   cancel: [];
}>();

const onCancel = () => {
   emit('cancel');
   selected.value = null;
};

const onSelect = () => {
   if (!selected.value) throw new UnexpectedRuntimeError('Idk?');
   emit('select', selected.value);
   selected.value = null;
};
</script>

<template>
   <DialogRoot v-model:open="open">
      <DialogPortal>
         <DialogOverlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />

         <DialogContent
            @escape-key-down="onCancel"
            class="border-stroke bg-card font-label text-ink fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-5 shadow-xl focus:outline-none"
         >
            <DialogTitle class="text-ink text-sm font-semibold"> {{ title || 'Popup' }} </DialogTitle>

            <ListboxRoot
               :default-value="options[0]?.id"
               v-model:model-value.number="selected"
               @update:model-value="onSelect"
               class="py-6"
            >
               <ListboxContent class="themed-scroll max-h-56 w-full overflow-y-auto">
                  <ListboxItem
                     v-for="(option, index) in options"
                     :key="option.id"
                     :value="option.id"
                     class="text-muted data-highlighted:bg-highlight/10 data-highlighted:text-ink data-[state=checked]:text-ink focus-visible:bg-highlight/10 focus-visible:text-ink relative flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors outline-none select-none data-[state=checked]:font-medium"
                  >
                     <span class="truncate pr-4">{{ index }} - {{ option.name }}</span>

                     <ListboxItemIndicator>
                        <i class="fa-solid fa-check text-highlight text-sm"></i>
                     </ListboxItemIndicator>
                  </ListboxItem>
               </ListboxContent>
            </ListboxRoot>

            <div class="flex justify-end gap-2">
               <DialogClose
                  @click="onCancel"
                  type="button"
                  class="text-card rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
               >
                  Cancel
               </DialogClose>
            </div>
         </DialogContent>
      </DialogPortal>
   </DialogRoot>
</template>

<style scoped>
.themed-scroll {
   /* Firefox */
   scrollbar-width: thin;
   scrollbar-color: var(--color-muted) transparent;
}

/* Chrome, Edge, Safari */
.themed-scroll::-webkit-scrollbar {
   width: 6px;
}

.themed-scroll::-webkit-scrollbar-track {
   background: transparent;
}

.themed-scroll::-webkit-scrollbar-thumb {
   background-color: var(--color-muted); /* Updated to match Firefox */
   border-radius: 9999px;
}
</style>
