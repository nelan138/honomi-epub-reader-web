<template>
   <AspectRatio :ratio="ratio">
      <img class="h-full w-full object-cover" :src="src" :alt="alt" />
   </AspectRatio>
</template>

<script setup lang="ts">
import { AspectRatio } from 'reka-ui';

const props = withDefaults(
   defineProps<{
      src: string;
      ratio?: number;
      alt?: string;
   }>(),
   {
      ratio: 2 / 3,
      alt: '',
   }
);

// clean up blob urls
onUnmounted(() => {
   if (props.src.startsWith('blob:')) {
      URL.revokeObjectURL(props.src);
   }
});
</script>
