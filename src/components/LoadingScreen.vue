<template>
   <DialogRoot :open="open">
      <DialogPortal>
         <DialogOverlay class="fixed inset-0 z-50 bg-(--loading-overlay) backdrop-blur-xs transition-opacity" />

         <DialogContent
            class="fixed top-1/2 left-1/2 z-50 flex w-full max-w-xs -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-3 rounded-lg border border-(--loading-border) bg-(--loading-bg) p-6 font-sans text-(--loading-text) shadow-lg focus:outline-none"
            @pointer-down-outside.prevent
            @escape-key-down.prevent
         >
            <i class="fa-solid fa-circle-notch animate-spin text-3xl text-(--loading-accent)" aria-hidden="true" />

            <DialogTitle class="text-sm font-semibold tracking-wider uppercase">
               {{ message }}
            </DialogTitle>

            <DialogDescription class="text-center text-xs opacity-70">
               {{ subtext }}
            </DialogDescription>
         </DialogContent>
      </DialogPortal>
   </DialogRoot>
</template>

<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription } from 'reka-ui';

/* *** */

const {
   open = false,
   message = 'Loading...',
   subtext = 'Please wait while content is prepared',
} = defineProps<{
   open?: boolean;
   message?: string;
   subtext?: string;
}>();
</script>

<style lang="css" scoped>
:global(html) {
   --loading-overlay: rgb(43 38 32 / 0.45);
   --loading-bg: #faf7f0;
   --loading-border: #ded6c5;
   --loading-text: #2b2620;
   --loading-accent: #8c6d46;
}

:global(html.dark) {
   --loading-overlay: rgb(10 12 14 / 0.7);
   --loading-bg: #1a1e22;
   --loading-border: #2e353c;
   --loading-text: #e0e6ed;
   --loading-accent: #d4a373;
}
</style>
