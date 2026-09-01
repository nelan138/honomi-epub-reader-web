<script setup lang="ts">
const emit = defineEmits<{
   importFiles: [files: FileList];
   addCategory: [];
   toggleTheme: [];
}>();
</script>

<template>
   <header
      class="hover:border-b-highlight bg-surface border-b-stroke/50 sticky top-0 z-100 mx-auto flex w-full items-center justify-between border-b-2 px-4 py-2 md:px-16 xl:px-32 2xl:px-64"
   >
      <ul class="text-ink/70 flex gap-6">
         <li>
            <label class="hover:text-highlight cursor-pointer transition-colors">
               <i class="fa-solid fa-upload scale-[110%]"></i>
               <input
                  @change="
                     (payload) => {
                        const target = payload.target as HTMLInputElement;
                        if (target.files && target.files.length > 0) emit('importFiles', target.files);
                     }
                  "
                  class="hidden"
                  type="file"
                  accept=".epub,application/epub+zip"
                  multiple
               />
            </label>
         </li>
         <li>
            <a
               href="https://github.com/nelan138/honomi-epub-reader-web"
               target="_blank"
               rel="noopener noreferrer"
               class="hover:text-highlight transition-colors"
            >
               <i class="fa-brands fa-github scale-[110%]"></i>
            </a>
         </li>
      </ul>

      <ul class="text-ink/70 flex gap-6">
         <li>
            <button
               @click="() => emit('addCategory')"
               type="button"
               class="hover:text-highlight transition-colors hover:cursor-pointer"
            >
               <i class="fa-solid fa-folder-plus scale-[110%]"></i>
            </button>
         </li>
         <li>
            <button
               @click="() => emit('toggleTheme')"
               type="button"
               class="hover:text-highlight transition-colors hover:cursor-pointer"
            >
               <i class="fa-solid fa-circle-half-stroke scale-[110%]"></i>
            </button>
         </li>
      </ul>
   </header>
</template>

<style scoped></style>
