import { createDeferredPromise, type DeferredPromise } from '@src/utils.ts';

/** bind this to `:open` of the modal */
export const active = ref<boolean>(false);

type Options = {
   title?: string;
   description?: string;
   placeholder?: string;
   defaultValue?: string;
};

export const options = shallowRef<Options>({});

let deferred: DeferredPromise<string | null> | null = null;

export function usePrompt() {
   /** returns string on submit, null on cancel */
   function prompt(_options: Options): Promise<string | null> {
      if (deferred !== null) {
         console.warn('Another prompt promise is still running, resolving it with `null`');
         deferred.resolve(null);
      }

      options.value = _options;
      active.value = true;

      deferred = createDeferredPromise();
      return deferred.promise;
   }

   const closeAndResetDialog = () => {
      active.value = false;
      options.value = {};
   };

   function submit(_input: string): void {
      if (deferred === null) {
         console.warn('`submit()` is called before `prompt()`');
         return;
      }

      closeAndResetDialog();

      deferred.resolve(_input);
      deferred = null;
   }

   function cancel(): void {
      if (deferred === null) {
         console.warn('`cancel()` is called before `prompt()`');
         return;
      }

      closeAndResetDialog();

      deferred.resolve(null);
      deferred = null;
   }

   return {
      prompt,
      submit,
      cancel,
   };
}
