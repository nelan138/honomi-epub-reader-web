import { defineStore } from 'pinia';
import { getBookFromDB, updateCharactersReadInDB } from '~/services/dexie/bookRepo';

export const useReaderStore = defineStore('reader', {
   state: () => ({
      book: null as Pick<BookRecord, 'charactersRead' | 'id' | 'sections' | 'navigation' | 'images'> | null,

      isLoading: false,
      isLoaded: false,
   }),

   getters: {
      characters(): number {
         if (this.book === null) return 0;

         let runningCount = 0;
         for (const section of this.book.sections) {
            const doc = domParser.parseFromString(section.content, 'application/xhtml+xml');

            for (const pEl of doc.querySelectorAll('p')) {
               runningCount += getCharacterCOuntInElement(pEl);
            }
         }

         return runningCount;
      },

      charactersRead(): number {
         return this.book?.charactersRead ?? 0;
      },

      progress(): number {
         if (!this.book || this.characters === 0) {
            return 0;
         }

         return (this.charactersRead / this.characters) * 100;
      },

      navigation(): NavigationItem[] {
         if (this.book === null) return [];

         return this.book.navigation ?? [];
      },

      sections(): Section[] {
         if (this.book === null) return [];

         return this.book.sections;
      },
   },

   actions: {
      async load(bookId: number) {
         if (this.isLoading || this.isLoaded) return;

         this.isLoading = true;

         const [result, error] = await tryCatch(getBookFromDB(bookId));

         if (error) {
            this.isLoading = false;
            this.isLoaded = false;

            throw new RuntimeError(`Failed to load book with ID ${bookId}`, {
               cause: error,
            });
         }

         if (result === null) {
            this.isLoading = false;
            this.isLoaded = false;

            throw new NotFoundError(`Book with ID ${bookId} not found in the database.`);
         }

         this.book = result;

         this.isLoading = false;
         this.isLoaded = true;
      },

      /**
       * ! call this after load->sections to load all imgs in book and return blob urls
       *
       * it replaces img tag src with blob urls
       */
      loadImages(): string[] {
         if (this.book === null) return [];

         const imgBlobUrls = [] as string[];

         for (const section of this.book.sections) {
            const doc = domParser.parseFromString(section.content, 'application/xhtml+xml');

            for (const imageEl of doc.getElementsByTagName('img')) {
               const src = imageEl.getAttribute('src');
               if (!src) {
                  console.warn('Image tag with no src in:', section.idref);
                  continue;
               }

               const blob = this.book.images[src];
               if (!blob) {
                  console.warn('Image blob not in archive:', src);
                  continue;
               }

               const blobUrl = URL.createObjectURL(blob);
               imageEl.setAttribute('src', blobUrl);

               imgBlobUrls.push(blobUrl);
            }

            section.content = xmlSerializer.serializeToString(doc);
         }

         return imgBlobUrls;
      },

      /**
       * 1. replaces the href with the correct element's id in reader content
       * (bcs all sections are rendered in page not in separate files)
       *
       * 2. add `id='<file path>' to each section so that any href with no fragment (#) will reference that section instead`
       *
       * 3. this process affects both the book.navigation and all the <a> inside all section.content
       *
       * ! Skips external links
       */
      loadAnchorInternalLinks() {
         if (this.book === null || this.book.navigation === undefined) return;
         const URI_SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:/i;

         // * navigation
         for (const item of this.book.navigation) {
            if (URI_SCHEME_REGEX.test(item.href)) continue; // skip external

            const [filePath, fragment] = item.href.split('#');

            if (!fragment && filePath) item.href = `#${filePath}`;
            else if (fragment) item.href = `#${fragment}`;
         }

         // * content
         for (const section of this.book.sections) {
            const doc = domParser.parseFromString(section.content, 'application/xhtml+xml');
            doc.documentElement.id = section.path;
            for (const anchorEl of doc.querySelectorAll('a')) {
               const href = anchorEl.getAttribute('href');
               if (!href || URI_SCHEME_REGEX.test(href)) continue; // skip external

               const [filePath, fragment] = href.split('#');

               if (!fragment && filePath) anchorEl.setAttribute('href', `#${filePath}`);
               else if (fragment) anchorEl.setAttribute('href', `#${fragment}`);
            }

            section.content = xmlSerializer.serializeToString(doc);
         }
      },

      updateProgress(charactersRead: number, options?: { syncWithDb: boolean }) {
         if (this.book === null) return;
         if (charactersRead < 0 || charactersRead > this.characters) return;

         this.book.charactersRead = charactersRead;

         if (options?.syncWithDb) {
            updateCharactersReadInDB(this.book.id, charactersRead);
         }
      },

      restoreLastSection() {
         if (this.charactersRead !== 0) {
            let targetEl: Element | null = null;
            const paragraphs = document.querySelectorAll('p[data-characters-read]');

            for (const pEl of paragraphs) {
               const charactersRead = Number(pEl.getAttribute('data-characters-read'));

               // take the first one, skips all the one with duplicate characters read (e.g: pictures)
               const currentCharactersRead = Number(targetEl?.getAttribute('data-characters-read') ?? '-1');

               if (charactersRead === currentCharactersRead) continue;

               if (charactersRead > this.charactersRead) break;

               targetEl = pEl;
            }

            targetEl?.scrollIntoView();
         }
      },
   },
});
