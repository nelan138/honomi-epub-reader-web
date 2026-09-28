export type BookRecord = Book & {
   id: number;
   shelfId: number;
   charactersRead: number; // chars user has read of this book */
};

export type Shelf = {
   name: string;
   displayOrder: number; // The lower the number, the higher the shelf is displayed in the UI
};

export type ShelfRecord = Shelf & {
   id: number;
};
