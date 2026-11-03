<template>
   <USlideover
      v-model:open="isOpen"
      slide="right"
      :ui="{ content: 'max-w-xs', overlay: 'fixed inset-0 bg-transparent' }"
   >
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
         <div class="flex flex-col gap-2 text-base">
            <div class="inline-flex items-center gap-2 justify-between">
               <span>Writing mode</span>

               <USelect
                  v-model="writingMode"
                  :items="['horizontal', 'vertical']"
                  variant="none"
                  trailing-icon="lucide:chevron-right"
               />
            </div>

            <div class="inline-flex items-center gap-2 justify-between">
               <span>Paragraph font</span>

               <USelect
                  v-model="paragraphFont"
                  :items="fontsStore.fontNames"
                  variant="none"
                  trailing-icon="lucide:chevron-right"
               >
                  <template #content-bottom>
                     <USeparator />

                     <UButton
                        icon="lucide:plus"
                        label="new font"
                        size="sm"
                        color="neutral"
                        variant="ghost"
                        class="m-1"
                        @click="triggerFileInput"
                     />

                     <input
                        ref="fileInput"
                        hidden
                        multiple
                        type="file"
                        accept=".ttf,.otf,.woff,.woff2"
                        @change="handleFileChange"
                     >
                  </template>
               </USelect>
            </div>

            <div class="inline-flex items-center gap-2 justify-between">
               <span>Heading font</span>

               <USelect
                  v-model="headingFont"
                  :items="fontsStore.fontNames"
                  variant="none"
                  trailing-icon="lucide:chevron-right"
               >
                  <template #content-bottom>
                     <USeparator />
                     <UButton
                        icon="lucide:plus"
                        label="new font"
                        size="sm"
                        color="neutral"
                        variant="ghost"
                        class="m-1"
                        @click="triggerFileInput"
                     />
                  </template>
               </USelect>
            </div>

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

            <div class="inline-flex items-center gap-2 justify-between">
               <span>Scroll speed</span>

               <UInputNumber
                  v-model="scrollSpeed"
                  orientation="vertical"
                  :min="1"
                  :max="200"
                  variant="outline"
                  class="w-[40%] mx-2"
               />
            </div>

            <div class="inline-flex items-center gap-2 justify-between">
               <span>Padding</span>

               <USelect
                  v-model="bookPadding"
                  :items="['none', 'compact', 'normal', 'relaxed', 'spacious']"
                  variant="none"
                  trailing-icon="lucide:chevron-right"
               />
            </div>

            <div class="inline-flex items-center gap-2 justify-between">
               <span>Progress</span>

               <USelect
                  v-model="progressDisplay"
                  :items="['default', 'percentage', 'none']"
                  variant="none"
                  trailing-icon="lucide:chevron-right"
               />
            </div>

            <div class="inline-flex items-center gap-2 justify-between">
               <span>Furigana</span>

               <USelect
                  v-model="furiganaDisplay"
                  :items="['show', 'hover', 'none']"
                  variant="none"
                  trailing-icon="lucide:chevron-right"
               />
            </div>
         </div>
      </template>
   </USlideover>
</template>

<script lang="ts" setup>
import { addFontToDB } from '~/services/dexie/fontRepo';

const settingsStore = useSettingsStore();
const readerStore = useReaderStore();
const fontsStore = useFontsStore();
const toast = useToast();

/* *** */

onMounted(() => {
   fontsStore.load();
});

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

const writingMode = computed({
   get: () => settingsStore.writingMode,
   set: (value: WritingMode) => settingsStore.setWritingMode(value),
});

watch(writingMode, async () => {
   await nextTick();
   await nextFrame();

   readerStore.restoreLastSection();
});

const scrollSpeed = computed({
   get: () => settingsStore.scrollSpeed,
   set: (value: number) => settingsStore.setScrollSpeed(value),
});

const bookPadding = computed({
   get: () => settingsStore.bookPadding,
   set: (value: BookPadding) => settingsStore.setBookPadding(value),
});

const progressDisplay = computed({
   get: () => settingsStore.progressDisplay,
   set: (value: ProgressDisplay) => settingsStore.setProgressDisplay(value),
});

const furiganaDisplay = computed({
   get: () => settingsStore.furiganaDisplay,
   set: (value: FuriganaDisplay) => settingsStore.setFuriganaDisplay(value),
});

const paragraphFont = computed({
   get: () => settingsStore.paragraphFont,
   set: (value: string) => settingsStore.setParagraphFont(value),
});

const headingFont = computed({
   get: () => settingsStore.headingFont,
   set: (value: string) => settingsStore.setHeadingFont(value),
});

const fileInput = ref<HTMLInputElement | null>(null);

async function triggerFileInput() {
   fileInput.value?.click();
}

async function handleFileChange(event: Event) {
   const target = event.target as HTMLInputElement;
   const files = target.files;

   if (!files || files.length === 0) {
      return;
   }

   for (const font of files) {
      const [, error] = await tryCatch(addFontToDB(font));
      if (error) {
         toast.add({
            title: 'Failed to load from database',
            description: error?.message,
            color: 'error',
         });

         return;
      }

      await fontsStore.syncWithDB();
   }
}
</script>

<style></style>
