<script setup lang="ts">
const emit = defineEmits<{
   importFiles: [files: FileList];
   addShelf: [];
   toggleTheme: [];
}>();

function onFileChange(event: Event) {
   const target = event.target as HTMLInputElement;
   if (target.files) {
      emit('importFiles', target.files);
   }
}
</script>

<template>
   <header
      class="sticky top-0 z-50 mx-auto flex w-full items-center justify-between border-b border-(--library-header-border) bg-(--library-header-bg) px-4 py-2 md:px-16 xl:px-32 2xl:px-64"
   >
      <ul class="flex gap-6">
         <li>
            <label class="cursor-pointer">
               <i class="fa-solid fa-upload scale-[110%]"></i>
               <input @change="onFileChange" class="hidden" type="file" accept=".epub,application/epub+zip" multiple />
            </label>
         </li>
         <li>
            <a
               href="https://github.com/nelan138/honomi-epub-reader-web"
               target="_blank"
               rel="noopener noreferrer"
               class=""
            >
               <i class="fa-brands fa-github scale-[110%]"></i>
            </a>
         </li>
      </ul>

      <ul class="flex gap-6">
         <li>
            <button @click="emit('addShelf')" type="button" class="hover:cursor-pointer">
               <i class="fa-solid fa-folder-plus scale-[110%]"></i>
            </button>
         </li>
         <li>
            <button @click="emit('toggleTheme')" type="button" class="hover:cursor-pointer">
               <i class="fa-solid fa-circle-half-stroke scale-[110%]"></i>
            </button>
         </li>
      </ul>
   </header>
</template>

<style scoped>
:global(html) {
   --library-header-bg: #f6f2e6;
   --library-header-border: var(--tertiary);
}
:global(html.dark) {
   --library-header-bg: #15181a;
   --library-header-border: var(--tertiary);
}
</style>
