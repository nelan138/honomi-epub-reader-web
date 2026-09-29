<template>
   <UModal
      :title="title"
      :description="description"
      :overlay="true"
      :modal="true"
      :dismissible="false"
      :close="{
         onClick: () => {
            emit('close', null);
         },
      }"
   >
      <template #body>
         <UListbox v-model="selectedItem" :items="items" />
      </template>

      <template #footer>
         <UFieldGroup class="flex justify-end gap-2 w-full">
            <UButton
               ref="selectBtn"
               label="Cancel"
               variant="ghost"
               @click="emit('close', null)"
            />
            <UButton label="Select" @click="emit('close', selectedItem)" />
         </UFieldGroup>
      </template>
   </UModal>
</template>

<script lang="ts" setup>
import type { ListboxItem } from "@nuxt/ui";

// ! `null` on cancel, `string` on submit
const emit = defineEmits<{
   close: [value: ListboxItem | null];
}>();

const {
   title = undefined,
   description = undefined,
   items = [],
} = defineProps<{
   title?: string;
   description?: string;
   items?: ListboxItem[];
}>();

const selectedItem = ref<ListboxItem>(items.at(0) ?? {});
</script>
