<script lang="ts" setup>
const props = defineProps<{
   /** * HTML string */
   content: string;
}>();
</script>

<template>
   <!-- TODO:  [content-visibility:auto] not working right with scrolling into view -->
   <div v-html="content"></div>
</template>
