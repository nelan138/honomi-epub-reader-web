<template>
   <USlideover v-model:open="isOpen" slide="right" :overlay="false" :ui="{ content: 'max-w-xs' }">
      <UButton icon="lucide:settings" variant="ghost" color="neutral" />

      <template #header>
         <h2>Settings</h2>

         <UButton
            icon="lucide:x"
            color="neutral"
            variant="link"
            class="absolute right-2 top-2"
            @click="isOpen = false"
         />
      </template>

      <template #body>
         <!-- todo: writing mode, font family (p, blockquote, heading), furigana, progress display -->
         <div class="flex flex-col gap-2 text-base">
            <div class="inline-flex items-center gap-2 justify-between">
               <span>Size</span>
               <USelect
                  v-model="fontSize"
                  :items="['sm', 'base', 'lg', 'xl', '2xl']"
                  variant="none"
                  trailing-icon="lucide:chevron-right"
               />
            </div>

            <div class="inline-flex items-center gap-2 justify-between">
               <span>
                  <ruby>Leading<rt>line height</rt></ruby>
               </span>

               <USelect
                  v-model="fontLeading"
                  :items="['tight', 'snug', 'normal', 'relaxed', 'loose']"
                  variant="none"
                  trailing-icon="lucide:chevron-right"
               />
            </div>

            <div class="inline-flex items-center gap-2 justify-between">
               <span>
                  <ruby>Tracking<rt>letter spacing</rt></ruby>
               </span>

               <USelect
                  v-model="fontTracking"
                  :items="['tighter', 'tight', 'normal', 'wide', 'wider', 'widest']"
                  variant="none"
                  trailing-icon="lucide:chevron-right"
               />
            </div>

            <div class="inline-flex items-center gap-2 justify-between">
               <span>Kerning</span>

               <USelect
                  v-model="fontKerning"
                  :items="['auto', 'none']"
                  variant="none"
                  trailing-icon="lucide:chevron-right"
               />
            </div>
         </div>
      </template>
   </USlideover>
</template>

<script lang="ts" setup>
const settingsStore = useSettingsStore();

/* *** */

const isOpen = ref(false);

const fontSize = computed({
   get: () => settingsStore.fontSize,
   set: (value: FontSize) => settingsStore.setFontSize(value),
});

const fontLeading = computed({
   get: () => settingsStore.fontLeading,
   set: (value: FontLeading) => settingsStore.setFontLeading(value),
});

const fontTracking = computed({
   get: () => settingsStore.fontTracking,
   set: (value: FontTracking) => settingsStore.setFontTracking(value),
});

const fontKerning = computed({
   get: () => settingsStore.fontKerning,
   set: (value: FontKerning) => settingsStore.setFontKerning(value),
});
</script>

<style></style>
