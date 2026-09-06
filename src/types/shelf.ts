/**
 * * Represents a record in the database.
 */
export type ShelfRecord = {
   id: number;
   name: string;

   displayOrder: number; // The lower the number, the higher the shelf is displayed in the UI
   expanded: false | true;
};

/**
 * Use for UI
 */
export type UIShelf = ShelfRecord;
