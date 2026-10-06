<template>
   <USlideover title="Settings (experimental)" slide="right" :overlay="false">
      <UButton icon="lucide:settings" variant="ghost" color="neutral" />

      <template #body>
         <ul class="flex flex-col gap-4">
            <li>
               <h3>Writing mode</h3>
               <URadioGroup :items="['horizontal', 'vertical']" />
            </li>

            <li>
               <h3>Font family</h3>
               <USelect :items="['1', '2', '3']" />
            </li>

            <li>
               <h3>Font size</h3>
               <USelect v-model="fontSize" :items="['sm', 'base', 'lg', 'xl', '2xl']" />
            </li>

            <li>
               <h3>Line height</h3>
               <UInputNumber orientation="vertical" />
            </li>

            <li>
               <h3>Show furigana</h3>
               <URadioGroup :items="['default', 'hover', 'hidden']" orientation="horizontal" />
            </li>

            <li>
               <h3>Show progress</h3>
               <URadioGroup :items="['default', 'percentage', 'hidden']" orientation="horizontal" />
            </li>
         </ul>
      </template>
   </USlideover>
</template>

<script lang="ts" setup>
const settingsStore = useSettingsStore();

/* *** */

const fontSize = computed({
   get: () => settingsStore.fontSize,
   set: (value: FontSize) => settingsStore.setFontSize(value),
});
</script>

<style></style>
