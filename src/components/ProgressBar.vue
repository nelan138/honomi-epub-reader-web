<template>
   <ProgressRoot :model-value="value" class="relative h-1 w-full overflow-hidden rounded-full bg-(--progress-bar-bg)">
      <ProgressIndicator
         class="h-full w-full bg-(--progress-bar-color)"
         :style="`transform: translateX(-${100 - value}%)`"
      />
   </ProgressRoot>
</template>

<script setup lang="ts">
import { ProgressRoot, ProgressIndicator } from 'reka-ui';

/* *** */

const { value } = defineProps<{
   value: number;
}>();
</script>

<style scoped>
:global(html) {
   --progress-bar-bg: #e5ded0;
   --progress-bar-color: #8c6d46;
}

:global(html.dark) {
   --progress-bar-bg: #262b30;
   --progress-bar-color: #878f97;
}
</style>
