import { ref } from 'vue';
import { createDeferredPromise } from '@src/utilities.ts';
import { type DeferredPromise, UnexpectedRuntimeError } from '@src/types';

export function useSelectDialog() {
   const isOpen = ref<boolean>(false);

   const openDialog = () => {
      isOpen.value = true;
   };

   const closeDialog = () => {
      isOpen.value = false;
   };

   let userSelect: DeferredPromise<number | null> | null = null;

   const dialogPrompt = () => {
      userSelect = createDeferredPromise<number | null>();
      openDialog();
      return userSelect.promise;
   };

   const resolveSelect = (optionId: number) => {
      if (userSelect === null)
         throw new UnexpectedRuntimeError('Promise is null');

      closeDialog();
      userSelect.resolve(optionId);
      userSelect = null;
   };

   const resolveCancel = () => {
      if (userSelect === null)
         throw new UnexpectedRuntimeError('Promise is null');

      closeDialog();
      userSelect.resolve(null);
      userSelect = null;
   };

   return {
      isOpen,
      dialogPrompt,
      resolveSelect,
      resolveCancel,
   };
}
