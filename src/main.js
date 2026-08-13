import openDatabase from "./database/database.js";
import bindThemeEvents from "./pages/bookshelf/events/bookshelf-header-events.js";
import renderBookshelf from "./pages/bookshelf/features/render-bookshelf.js";
import bindBookImportEvents from "./pages/bookshelf/features/import-books.js";

await openDatabase();
await bindBookImportEvents();
await bindThemeEvents();
await renderBookshelf();
