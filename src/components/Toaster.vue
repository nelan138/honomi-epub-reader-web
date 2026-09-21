<script setup lang="ts">
import { notifications, type Notification } from '@src/composables/useToast';
import {
   ToastDescription,
   ToastProvider,
   ToastRoot,
   ToastTitle,
   ToastViewport,
   ToastClose,
   ToastPortal,
} from 'reka-ui';

function handleDismiss(notification: Notification) {
   notification.active = false;

   setTimeout(() => {
      const index = notifications.value.indexOf(notification);
      if (index !== -1) notifications.value.splice(index, 1);
   }, 300); // ? because reka uses 100ms on exist
}

const {} = defineProps<{
   to: string;
}>();
</script>

<template>
   <ToastProvider>
      <ToastRoot
         v-for="notification in notifications"
         :key="notification.id"
         v-model:open="notification.active"
         :duration="notification.duration"
         @update:open="handleDismiss(notification)"
         class="data-[state=open]:animate-slideIn data-[state=closed]:animate-hide data-[swipe=end]:animate-swipeOut bg-surface border-highlight grid grid-cols-[auto_max-content] items-center gap-x-3.75 rounded-lg border-2 p-3.75 shadow-sm [grid-template-areas:'title_action'_'description_action'] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[transform_200ms_ease-out] data-[swipe=move]:translate-x-(--reka-toast-swipe-move-x)"
      >
         <ToastTitle class="text-ink mb-1.25 pb-2 text-base font-medium [grid-area:title]">
            {{ notification.title }}
         </ToastTitle>
         <ToastDescription as-child>
            <span class="text-muted text-sm [grid-area:description]">
               {{ notification.description }}
            </span>
         </ToastDescription>
         <ToastClose class="text-tertiary rounded p-1 [grid-area:action] focus:outline-none"> ✕ </ToastClose>
      </ToastRoot>
      <ToastPortal :to="to">
         <ToastViewport
            class="fixed right-0 bottom-0 z-1000 m-0 flex w-97.5 max-w-[100vw] list-none flex-col gap-2.5 p-(--viewport-padding) outline-none [--viewport-padding:25px]"
         />
      </ToastPortal>
   </ToastProvider>
</template>
