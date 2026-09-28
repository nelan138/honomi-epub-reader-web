<template>
   <section>
      <header class="flex flex-col-2 justify-between">
         <h2 class="line-clamp-2 font-medium break-all">{{ name }}</h2>

         <div>
            <template
               v-if="name !== defaultShelf.name && id !== defaultShelf.id"
            >
               <UButton
                  variant="ghost"
                  color="neutral"
                  icon="lucide:pencil"
                  @click="handleRenamingShelf(id)"
               />
               <UButton
                  variant="ghost"
                  color="neutral"
                  icon="lucide:circle-chevron-up"
               />
               <UButton
                  variant="ghost"
                  color="neutral"
                  icon="lucide:circle-chevron-down"
               />
               <UButton
                  variant="ghost"
                  color="neutral"
                  icon="lucide:x"
                  @click="store.delete(id)"
               />
            </template>

            <UButton
               v-if="expanded"
               variant="ghost"
               color="neutral"
               icon="lucide:chevron-down"
               @click="expanded = false"
            />

            <UButton
               v-else
               variant="ghost"
               color="neutral"
               icon="lucide:chevron-up"
               @click="expanded = true"
            />
         </div>
      </header>

      <div
         v-if="expanded"
         class="3xl:grid-cols-4 grid w-full grid-cols-1 gap-4 lg:grid-cols-3"
      >
         <slot />
      </div>
   </section>
</template>

<script lang="ts" setup>
import { defaultShelf } from '~/services/dexie/database';

const inputModal = useInputModal();
const toast = useToast();
const store = useShelvesStore();

/* *** */

onMounted(() => {
   store.load();
});

const { id, name } = defineProps<{
   id: number;
   name: string;
}>();

const expanded = ref(true);

async function handleRenamingShelf(id: number) {
   const newName = await inputModal.open({
      title: "Rename Shelf",
      description: "Name must be unique, and cannot be empty",
   });

   if (newName === null) return;

   if (store.shelves.find((shelf) => shelf.name === newName)) {
      toast.add({
         title: "Shelf name already exists",
         color: "error",
      });
      return;
   }

   store.rename(id, newName);
}
</script>
