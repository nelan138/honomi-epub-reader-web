<template>
   <div>
      <LibraryHeader />

      <UMain class="bg-muted">
         <UBanner icon="lucide:info" title="We are still in development" color="info" close />

         <UContainer>
            <slot />
         </UContainer>
      </UMain>
   </div>
</template>

<script setup lang="ts"></script>
