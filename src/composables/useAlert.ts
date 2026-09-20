import { createDeferredPromise, type DeferredPromise } from '@src/utils.ts';

type Options = {
   title?: string;
   description?: string;
   confirmText?: string;
   cancelText?: string;
};

// Module scope //
export const active = ref<boolean>(false);
export const options = shallowRef<Options>({});

let deferred: DeferredPromise<boolean> | null = null;
// ----------- //

export function useAlert() {
   /** true on confirm, false on cancel */
   function alert(_options: Options): Promise<boolean> {
      if (deferred !== null) {
         console.warn('Another alert promise is still running, resolving it with `false`');
         deferred.resolve(false);
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

   function confirm(): void {
      if (deferred === null) {
         console.warn('`confirm()` used before alert()');
         return;
      }

      closeAndResetDialog();
      deferred.resolve(true);
      deferred = null;
   }

   function cancel(): void {
      if (deferred === null) {
         console.warn('`cancel()` used before alert()');
         return;
      }

      closeAndResetDialog();
      deferred.resolve(false);
      deferred = null;
   }

   return {
      alert,
      confirm,
      cancel,
   };
}
