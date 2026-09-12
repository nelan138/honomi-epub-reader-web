import { ref } from 'vue';
import { createDeferredPromise, type DeferredPromise } from '@src/utilities.ts';
import { UnexpectedRuntimeError } from '@src/types/errors.ts';

export function useConfirmDialog() {
   const isOpen = ref(false);

   let userConfirm: DeferredPromise<boolean> | null = null;
   const openDialog = () => {
      isOpen.value = true;
   };
   const closeDialog = () => {
      isOpen.value = false;
   };

   const dialogPrompt = (): Promise<boolean> => {
      openDialog();

      userConfirm = createDeferredPromise();
      return userConfirm.promise;
   };

   const resolveConfirm = () => {
      if (!userConfirm) throw new UnexpectedRuntimeError('No deferred promise exists for user confirmation.');

      closeDialog();
      userConfirm.resolve(true);
      userConfirm = null;
   };

   const resolveCancel = () => {
      if (!userConfirm) throw new UnexpectedRuntimeError('No deferred promise exists for user confirmation.');

      closeDialog();
      userConfirm.resolve(false);
      userConfirm = null;
   }

   return {
      isOpen,
      dialogPrompt,
      resolveConfirm,
      resolveCancel
   };
}
