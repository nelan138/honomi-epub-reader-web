<script setup lang="ts">
import { notifications, type Notification } from '@src/composables/useToast';
import { ToastDescription, ToastProvider, ToastRoot, ToastTitle, ToastViewport, ToastClose } from 'reka-ui';

function handleDismiss(notification: Notification) {
   notification.active = false;

   setTimeout(() => {
      const index = notifications.value.indexOf(notification);
      if (index !== -1) notifications.value.splice(index, 1);
   }, 300); // ? because reka uses 100ms on exist
}
</script>

<template>
   <ToastProvider>
      <ToastRoot
         v-for="notification in notifications"
         :key="notification.id"
         v-model:open="notification.active"
         :duration="notification.duration"
         @update:open="handleDismiss(notification)"
         class="data-[state=open]:animate-slideIn data-[state=closed]:animate-hide data-[swipe=end]:animate-swipeOut grid grid-cols-[auto_max-content] items-center gap-x-3.75 rounded-lg border bg-white p-3.75 shadow-sm [grid-template-areas:'title_action'_'description_action'] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[transform_200ms_ease-out] data-[swipe=move]:translate-x-(--reka-toast-swipe-move-x)"
      >
         <ToastTitle class="text-slate12 mb-1.25 text-sm font-medium [grid-area:title]">
            {{ notification.title }}
         </ToastTitle>
         <ToastDescription as-child>
            <span class="text-slate11 text-sm opacity-90 [grid-area:description]">
               {{ notification.description }}
            </span>
         </ToastDescription>
         <ToastClose
            class="rounded p-1 text-slate-500 [grid-area:action] hover:bg-slate-100 hover:text-slate-900 focus:outline-none"
            aria-label="Close"
         >
            ✕
         </ToastClose>
      </ToastRoot>
      <ToastViewport
         class="fixed right-0 bottom-0 z-2147483647 m-0 flex w-97.5 max-w-[100vw] list-none flex-col gap-2.5 p-(--viewport-padding) outline-none [--viewport-padding:25px]"
      />
   </ToastProvider>
</template>
