import { createDeferredPromise, type DeferredPromise } from '@src/utils.ts';

/* *** */

type Selection = {
   id: number | string;
   /** value to display */
   value: number | string;
};

type Options = {
   title?: string;
   description?: string;
};

export const active = ref(false);
export const selections = shallowRef<Selection[]>([]);
export const options = shallowRef<Options>({});

let deferred = null as DeferredPromise<Selection | null> | null;

export function useSelect() {
   // returns selected on confirm, null on cancel
   function select(
      _selections: Selection[],
      _options?: { title?: string; description?: string },
   ): Promise<Selection | null> {
      if (deferred !== null) {
         console.warn('Another select promise is still running, resolving it with `null`');
         deferred.resolve(null);
      }

      deferred = createDeferredPromise();
      active.value = true;

      selections.value = _selections;
      options.value = _options ?? {};
      return deferred.promise;
   }

   const closeAndResetDialog = () => {
      active.value = false;
      selections.value = [];
      options.value = {};
   };

   function cancel() {
      if (deferred === null) {
         console.warn('`cancel()` used before select()');
         return;
      }

      closeAndResetDialog();

      deferred.resolve(null);
      deferred = null;
   }

   function confirm(_option: Selection) {
      if (deferred === null) {
         console.warn('`confirm()` used before select()');
         return;
      }

      closeAndResetDialog();

      deferred.resolve(_option);
      deferred = null;
   }

   return {
      select,
      cancel,
      confirm,
   };
}
