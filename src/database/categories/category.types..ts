export type CategoryState = false | true;
export type DisplayOrders = { min: number; max: number };

export type CategoryDraft = {
   name: string;
   expanded: CategoryState;
};
export type CategoryRecord = CategoryDraft & {
   id: number;
   displayOrder: number;
};
