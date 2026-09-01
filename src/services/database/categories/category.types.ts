export type CategoryState = false | true;
export type DisplayOrders = { min: number; max: number };

export type CategoryRecord = {
   id: number;
   name: string;

   displayOrder: number;
   expanded: CategoryState;
};
