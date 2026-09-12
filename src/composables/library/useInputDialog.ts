import { ref } from 'vue';
import { createDeferredPromise } from '@src/utilities.ts';
import { type DeferredPromise, UnexpectedRuntimeError } from '@src/types';

export function useInputDialog() {
   const isOpen = ref(false);
   const openDialog = () => {
      isOpen.value = true;
   };
   const closeDialog = () => {
      isOpen.value = false;
   };

   let userInput: DeferredPromise<string | null> | null = null;
   const dialogPrompt = (): Promise<string | null> => {
      openDialog();
      userInput = createDeferredPromise();
      return userInput.promise;
   };

   const resolveSubmit = (text: string) => {
      if (userInput === null) {
         throw new UnexpectedRuntimeError(
            'No deferred promise exists for user text input.',
         );
      }

      closeDialog();
      userInput.resolve(text);
      userInput = null;
   };

   const resolveCancel = () => {
      if (userInput === null) {
         throw new UnexpectedRuntimeError(
            'No deferred promise exists for user text input.',
         );
      }

      closeDialog();
      userInput.resolve(null);
      userInput = null;
   };

   return {
      isOpen,
      dialogPrompt,
      resolveSubmit,
      resolveCancel,
   };
}
