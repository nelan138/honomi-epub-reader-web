<template>
   <DrawerRoot v-model:open="open">
      <DrawerPortal :disabled="true">
         <DrawerOverlay class="fixed inset-0 z-100 bg-black/50" />
         <DrawerContent
            :disable-outside-pointer-events="false"
            class="fixed top-0 left-0 z-150 h-full w-80 max-w-[85vw] bg-(--background) p-4 text-(--ink)"
            as="aside"
         >
            <DrawerTitle>
               {{ title }}
            </DrawerTitle>

            <DrawerClose class="absolute top-4 right-4 hover:cursor-pointer">
               <i class="fa-solid fa-xmark"></i>
            </DrawerClose>

            <slot></slot>
         </DrawerContent>
      </DrawerPortal>
   </DrawerRoot>
</template>

<script setup lang="ts">
import { DrawerClose, DrawerContent, DrawerOverlay, DrawerPortal, DrawerRoot, DrawerTitle } from 'reka-ui';

/* *** */

const open = defineModel<boolean>('open');
const { title = '' } = defineProps<{ title?: string }>();

/**
 *


            <ul
               @click="
                  (event) => {
                     openToc = false;
                     onAnchorsClicked(event);
                  }
               "
            >
               <li v-for="{ label, href } in readerStore.navigation">
                  <a :href="href"> {{ label }} </a>
               </li>
            </ul>
 */
</script>

<style scoped></style>
