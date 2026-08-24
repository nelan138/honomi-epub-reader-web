import { openDatabase } from './database/database.ts';
import { getUserPreferences } from './database/user-setting-repository.ts';

import bindBookshelfHeaderEvents from './pages/bookshelf/events/bookshelf-header-events.ts';
import bindBookImportEvents from './pages/bookshelf/features/import-books.ts';
import bindCategoryEvents from './pages/bookshelf/events/category-events.ts';
import bindBookCardEvents from './pages/bookshelf/events/book-card-events.ts';

import '../styles/bookshelf.css';
import '../styles/forms.css';
import renderBookshelf from './pages/bookshelf/features/render-bookshelf.ts';

await openDatabase();
await renderBookshelf();

const userPreferences = await getUserPreferences();
document.documentElement.setAttribute('data-theme', userPreferences.theme);

bindBookshelfHeaderEvents();
bindCategoryEvents();
bindBookCardEvents();
bindBookImportEvents();
