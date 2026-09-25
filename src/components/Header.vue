<template>
   <header
      class="sticky top-0 z-50 mx-auto flex w-full items-center justify-between border-b-2 border-(--header-border) bg-(--header-bg) px-4 py-2 md:px-16 xl:px-32 2xl:px-64"
   >
      <slot> </slot>
   </header>
</template>

<script setup lang="ts">
/* *** */
</script>

<style scoped>
:global(html) {
   --header-bg: #f6f2e6;
   --header-border: #ded6c5;
}

:global(html.dark) {
   --header-bg: #15181a;
   --header-border: #2e353c;
}
</style>
