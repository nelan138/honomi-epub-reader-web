<template>
   <UModal
      :title="title"
      :description="description"
      :overlay="true"
      :modal="true"
      :dismissible="false"
      :close="{
         onClick: () => emit('close', false),
      }"
      :content="{
         onOpenAutoFocus: handleOpenAutoFocus,
      }"
   >
      <template #footer>
         <UFieldGroup class="flex justify-end gap-2 w-full">
            <UButton
               label="Cancel"
               variant="ghost"
               @click="emit('close', false)"
            />

            <UButton
               ref="confirmBtn"
               label="Confirm"
               form="input-modal-form"
               @click="emit('close', true)"
            />
         </UFieldGroup>
      </template>
   </UModal>
</template>

<script lang="ts" setup>
// ! `null` on cancel, `string` on submit
const emit = defineEmits<{
   close: [value: true | false];
}>();

const { title = undefined, description = undefined } = defineProps<{
   title?: string;
   description?: string;
}>();

const confirmBtn = ref<ComponentPublicInstance | null>(null);

function handleOpenAutoFocus(e: Event) {
   e.preventDefault();

   const buttonEl = confirmBtn.value?.$el as HTMLElement | undefined;
   buttonEl?.focus();
}
</script>

