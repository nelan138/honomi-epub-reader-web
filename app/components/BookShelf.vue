<template>
   <section>
      <header class="flex flex-row-1 items-center gap-2 justify-between pb-2 pt-4">
         <h2 class="line-clamp-2 font-mono flex items-center gap-2 text-sm uppercase tracking-[0.4em] text-primary break-all shrink-0">
            <UIcon name="lucide:book-open" /> {{ name }}
         </h2>

         <USeparator position="start" color="primary" />

         <div class="flex gap-2 shrink-0">
            <template v-if="name !== defaultShelf.name && id !== defaultShelf.id">
               <UButton size="sm" variant="ghost" color="primary" icon="lucide:pencil" @click="handleRenamingShelf" />

               <UButton
                  variant="ghost"
                  color="primary"
                  icon="lucide:circle-chevron-up"
                  size="sm"
                  @click="handleMovingShelf('up')"
               />

               <UButton
                  size="sm"
                  variant="ghost"
                  color="primary"
                  icon="lucide:circle-chevron-down"
                  @click="handleMovingShelf('down')"
               />

               <UButton variant="ghost" color="primary" icon="lucide:x" @click="handleDeletingShelf" />
            </template>

            <UButton
               size="sm"
               variant="ghost"
               color="primary"
               icon="lucide:chevron-right"
               :ui="{
                  leadingIcon: ['transition-transform duration-200 ease-out', expanded ? 'rotate-90' : 'rotate-0'],
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

   store.rename(id, newName);
}

async function handleDeletingShelf() {
   const confirmed = await alertModal.open({
      title: 'Delete Shelf',
      description: 'Are you sure you want to delete this shelf?',
   });

   if (confirmed) store.delete(id);
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
