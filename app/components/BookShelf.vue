<template>
   <section>
      <header class="flex flex-col-2 justify-between">
         <h2 class="line-clamp-2 font-medium break-all">Your Books</h2>

         <div>
            <UButton variant="ghost" color="neutral" icon="lucide:pencil" />
            <UButton variant="ghost" color="neutral" icon="lucide:chevron-up" />
            <UButton
               variant="ghost"
               color="neutral"
               icon="lucide:chevron-down"
            />
            <UButton variant="ghost" color="neutral" icon="lucide:x" />
         </div>
      </header>

      <div class="3xl:grid-cols-4 grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
         <slot />
      </div>
   </section>
</template>

<script lang="ts" setup></script>

<style></style>
