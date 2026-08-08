import { addCategory, openDatabase } from "./database/db.js";
import renderBookshelf from "./pages/bookshelf/features/render-bookshelf.js";

await openDatabase();

await import("./pages/bookshelf/features/import-books.js");
await renderBookshelf();
