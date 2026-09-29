import { ListModal } from "#components";

export function useListModal() {
   const overlay = useOverlay();
   const modal = overlay.create(ListModal);

   return modal;
}
