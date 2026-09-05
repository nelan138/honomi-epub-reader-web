<script setup lang="ts">
defineProps<{
   chunk: string;
}>();
</script>

<template>
   <!-- v-html is what actually renders the parsed string into real DOM nodes -->
   <div class="content-chunk-inner" v-html="chunk"></div>
</template>
