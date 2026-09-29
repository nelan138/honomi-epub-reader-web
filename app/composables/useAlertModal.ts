import { AlertModal } from "#components";

export function useAlertModal() {
   const overlay = useOverlay();
   const modal = overlay.create(AlertModal);

   return modal;
}
