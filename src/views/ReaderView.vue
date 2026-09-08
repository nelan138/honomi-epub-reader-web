<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import Header from '@src/components/reader/Header.vue';
import { useReader } from '@src/composables/reader/useReader';
import type { Chapter } from '@src/composables/reader/useReader';
import { onMounted, shallowRef } from 'vue';

const route = useRoute();
const router = useRouter();

const chapters = shallowRef<Chapter[]>([]);

onMounted(async () => {
   const params = route.params.bookId as string | undefined;
   const bookId = params ? parseInt(params) : NaN;

   try {
      const { getChapters } = await useReader(bookId);
      chapters.value = getChapters();
      console.log(`found ${chapters.value.length} chapters`);
   } catch {
      router.push('/error/book-not-found');
   }
});
</script>

<template>
   <div class="bg-bg">
      <Header />

      <main class="p-4">
         <article v-for="chapter in chapters" :key="chapter.idref" class="w-full">
            <div
               class="chapter prose prose-headings:text-ink text-ink max-h-full max-w-full [&_img]:mx-auto [&_img]:block [&_img]:max-h-[80dvh] [&_img]:max-w-[80dvw]"
               v-html="chapter.content"
            ></div>
         </article>
      </main>
   </div>
</template>

<style scoped>
.chapter {
   content-visibility: auto;
}
</style>
