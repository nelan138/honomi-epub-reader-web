<template>
   <section>
      <header class="flex flex-row-1 items-center gap-2 justify-between pb-2 pt-4">
         <h2
            class="line-clamp-1 font-mono flex items-center gap-2 text-sm uppercase font-semibold tracking-[0.3em] text-primary break-all shrink-0"
         >
            {{ name }}
         </h2>

         <USeparator position="start" color="neutral" />

         <div class="flex gap-2 shrink-0">
            <template v-if="name !== defaultShelf.name && id !== defaultShelf.id && expanded">
               <UButton size="sm" variant="link" color="neutral" icon="lucide:pencil" @click="handleRenamingShelf" />

               <UButton
                  variant="link"
                  color="neutral"
                  icon="lucide:circle-chevron-up"
                  size="sm"
                  @click="handleMovingShelf('up')"
               />

               <UButton
                  size="sm"
                  variant="link"
                  color="neutral"
                  icon="lucide:circle-chevron-down"
                  @click="handleMovingShelf('down')"
               />

               <UButton
                  variant="link"
                  color="neutral"
                  size="sm"
                  icon="lucide:x"
                  class="hover:text-error"
                  @click="handleDeletingShelf"
               />
            </template>

            <UButton
               size="sm"
               variant="ghost"
               color="neutral"
               icon="lucide:chevron-left"
               :ui="{
                  leadingIcon: ['transition-transform duration-200 ease-out', expanded ? '-rotate-90' : 'rotate-0'],
               }"
               @click="expanded = !expanded"
            />
         </div>
      </header>

      <div v-if="expanded" class="3xl:grid-cols-4 grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
         <slot />
      </div>
   </section>
</template>

<script lang="ts" setup>
import { defaultShelf } from '~/services/dexie/database';

const inputModal = useInputModal();
const alertModal = useAlertModal();

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

async function handleRenamingShelf() {
   const newName = await inputModal.open({
      title: 'Rename Shelf',
      description: 'Name must be unique, and cannot be empty',
   });

   if (newName === null) return;

   if (store.shelves.find((shelf) => shelf.name === newName)) {
      toast.add({
         title: 'Shelf name already exists',
         color: 'error',
      });
      return;
   }

   const [, e] = await tryCatch(store.rename(id, newName));
   if (e) {
      toast.add({
         title: 'Failed to rename shelf',
         description: e.message,
         color: 'error',
      });
   }
}

async function handleDeletingShelf() {
   const confirmed = await alertModal.open({
      title: 'Delete Shelf',
      description: 'Are you sure you want to delete this shelf?',
   });

   if (!confirmed) return;

   const [, e] = await tryCatch(store.delete(id));
   if (e) {
      toast.add({
         title: 'Failed to delete shelf',
         description: e.message,
         color: 'error',
      });
   }
}

async function handleMovingShelf(direction: 'up' | 'down') {
   const [_, e] = await tryCatch(store.move(id, direction));
   if (e) {
      toast.add({
         title: 'Failed to move shelf',
         description: e.message,
         color: 'error',
      });
   }
}
</script>
