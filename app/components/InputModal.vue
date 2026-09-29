<template>
   <UModal
      :title="title"
      :description="description"
      :overlay="true"
      :modal="true"
      :dismissible="false"
      :close="{
         onClick: () => emit('close', null),
      }"
   >
      <template #body>
         <UForm
            id="input-modal-form"
            :state="state"
            :validate="validate"
            :validate-on="['input']"
            @submit="emit('close', state.input)"
         >
            <UFormField name="input">
               <UInput
                  v-model="state.input"
                  :maxlength="maxLength"
                  autofocus
                  class="w-full"
               >
                  <template #trailing>
                     <span class="text-xs text-muted">
                        {{ state.input.length }} / {{ maxLength }}
                     </span>
                  </template>
               </UInput>
            </UFormField>
         </UForm>
      </template>

      <template #footer>
         <UFieldGroup class="flex justify-end gap-2 w-full">
            <UButton
               label="Cancel"
               type="button"
               variant="ghost"
               @click="emit('close', null)"
            />
            <UButton label="Submit" type="submit" form="input-modal-form" />
         </UFieldGroup>
      </template>
   </UModal>
</template>

<script lang="ts" setup>
import type { FormError } from "@nuxt/ui";

/* *** */

// ! `null` on cancel, `string` on submit
const emit = defineEmits<{
   close: [value: string | null];
}>();

const { title = undefined, description = undefined } = defineProps<{
   title?: string;
   description?: string;
}>();

const maxLength = 67;

type FormState = {
   input: string;
};

const state = ref<FormState>({ input: "" });

function validate(state: FormState): FormError[] {
   const errors = [] as FormError[];

   if (state.input.trim() === "")
      errors.push({ name: "input", message: "required" });
   else if (state.input.length > maxLength)
      errors.push({ name: "input", message: `exceeded max length` });

   return errors;
}
</script>
