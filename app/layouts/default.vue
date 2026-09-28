<template>
   <div>
      <UHeader :toggle="false" >
         <template #left>
            <UButton variant="outline" color="primary" icon="lucide:file-up" />

            <UButton
               to="https://github.com/nelan138/honomi-epub-reader-web"
               target="_blank"
               variant="link"
               color="neutral"
               icon="lucide:github"
            />
         </template>

         <template #right>
            <UButton
               variant="ghost"
               color="neutral"
               icon="lucide:folder-plus"
            />
            <UColorModeButton color="secondary" />
         </template>
      </UHeader>

      <UMain>
         <slot />
      </UMain>

      <UFooter />
   </div>
</template>

<script setup lang="ts"></script>
