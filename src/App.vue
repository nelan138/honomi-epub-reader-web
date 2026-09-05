<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
   <RouterView />
</template>

<style>
@import 'tailwindcss';
@custom-variant dark (&:where(.dark, .dark *));

:root {
   color-scheme: light;
   --bg-base: #eee7d8;
   --bg-card: #f6f2e6;
   --border-color: #2b2620;
   --text-ink: #2b2620;
   --text-muted: #7a6f5d;
   --highlight: #a8763e;
   --tertiary: #4a5d45;
}

.dark {
   color-scheme: dark;
   --bg-base: #1c2023;
   --bg-card: #15181a;
   --border-color: #010101;
   --text-ink: #fffffe;
   --text-muted: #94a1b2;
   --highlight: #7f5af0;
   --tertiary: #2cb67d;
}

@theme {
   --color-bg: var(--bg-base);
   --color-card: var(--bg-card);
   --color-surface: var(--bg-card);
   --color-stroke: var(--border-color);
   --color-ink: var(--text-ink);
   --color-muted: var(--text-muted);
   --color-highlight: var(--highlight);
   --color-tertiary: var(--tertiary);

   --font-serif: 'Spectral', 'Georgia', serif;
   --font-label: 'IBM Plex Sans', system-ui, sans-serif;
}

::view-transition-old(root),
::view-transition-new(root) {
   animation: none;
   mix-blend-mode: normal;
}
::view-transition-new(root) {
   z-index: 1;
}
::view-transition-old(root) {
   z-index: 0;
}
</style>
