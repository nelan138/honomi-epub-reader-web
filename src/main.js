import { openDatabase } from "./database/db.js";

await openDatabase();

await import("./pages/bookshelf/features/import-books.js");