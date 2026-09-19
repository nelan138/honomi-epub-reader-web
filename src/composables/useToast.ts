export type Notification = {
   id: number | string;
   title: string;
   description: string;
   duration: number; // ms
   active: boolean;
};

export const notifications = ref<Notification[]>([]);

export function useToast() {
   const toast = {
      success: (_title: string, _description?: string, options?: { duration?: number }) => {
         notifications.value.push({
            id: crypto.randomUUID(),
            title: _title,
            description: _description ?? '',
            duration: options?.duration ?? 1000,
            active: true,
         });
      },
      error: (_title: string, _description?: string, options?: { duration?: number }) => {
         notifications.value.push({
            id: crypto.randomUUID(),
            title: _title,
            description: _description ?? '',
            duration: options?.duration ?? 1000,
            active: true,
         });
      },
   };

   return { toast };
}
