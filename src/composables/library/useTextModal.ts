import { ref } from 'vue';
import { createDeferredPromise, type DeferredPromise } from '@src/utilities.ts';
import { EmptyStringError, UnexpectedRuntimeError } from '@src/types/errors.ts';

export function useTextModal() {
   const textDialogIsOpen = ref(false);
   const openTextDialog = () => {
      textDialogIsOpen.value = true;
   };
   const closeTextDialog = () => {
      textDialogIsOpen.value = false;
   };

   let textInput: DeferredPromise<string> | null = null;
   const textDialogPrompt = (): Promise<string> => {
      openTextDialog();
      textInput = createDeferredPromise();
      return textInput.promise;
   };

   const handleTextDialogSubmit = (input: string) => {
      if (textInput === null) {
         throw new UnexpectedRuntimeError(
            'No deferred promise exists for user text input.',
         );
      }

      if (input === '') {
         closeTextDialog();
         textInput.reject(new EmptyStringError('Name cannot be empty'));
         textInput = null;
         return;
      }

      closeTextDialog();
      textInput.resolve(input);
      textInput = null;
   };

   const handleTextDialogCancel = () => {
      if (textInput === null) return;

      closeTextDialog();
      textInput.resolve('');
      textInput = null;
   };

   return {
      textDialogIsOpen,
      textDialogPrompt,
      handleTextDialogSubmit,
      handleTextDialogCancel,
   };
}
