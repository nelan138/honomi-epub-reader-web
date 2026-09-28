<template>
   <article
      class="grid gap-4 w-full grid-cols-[1fr_2fr] rounded-md border border-(--card-border) bg-(--card) p-2 shadow-sm md:p-4"
   >
      <LazyNuxtImg alt="book-cover" src="/img/default-book-cover.jpeg" />

      <div class="w-full overflow-hidden flex h-full flex-col gap-4">
         <div class="flex min-w-0 flex-1 flex-col">
            <h3 class="text-base font-medium line-clamp-2 break-all">
               Book Title
            </h3>

            <div class="text-sm">
               <p class="truncate">Creator</p>
               <p class="truncate">Publisher</p>
               <p class="truncate">Language</p>
            </div>
         </div>

         <UProgress size="sm" color="neutral" :model-value="67" :max="100" />

         <UFieldGroup
            orientation="horizontal"
            class="flex justify-end gap-4 md:gap-8 lg:justify-around lg:gap-2"
         >
            <UButton variant="soft" color="neutral" icon="lucide:pen-line" />
            <UButton
               variant="soft"
               color="neutral"
               icon="lucide:arrow-left-right"
            />
            <UButton variant="soft" color="warning" icon="lucide:trash" />
         </UFieldGroup>
      </div>
   </article>
</template>

<script lang="ts" setup></script>

<style></style>
