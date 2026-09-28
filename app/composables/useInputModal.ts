import { InputModal } from "#components";

export function useInputModal() {
   const overlay = useOverlay();
   const modal = overlay.create(InputModal);

   return modal;
}
