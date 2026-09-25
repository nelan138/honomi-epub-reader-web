<template>
   <section class="w-full p-4 md:px-16 xl:px-32 2xl:px-64">
      <header class="flex justify-between py-2">
         <div class="flex w-full items-center">
            <slot name="label"> </slot>
         </div>

         <div class="flex gap-4 text-[80%] lg:gap-6">
            <slot name="actions"></slot>
         </div>
      </header>

      <div class="3xl:grid-cols-4 grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
         <slot name="books"> </slot>
      </div>
   </section>
</template>

<script setup lang="ts">
/* *** */
</script>
