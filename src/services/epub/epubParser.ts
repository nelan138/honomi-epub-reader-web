import { makeBook } from '@src/vendor/epub-parser-js/main.ts';
import { strFromU8 } from 'fflate';
import { domParser, EpubParsingError, UNICODE_GLYPH_REGEX, unwrapAsync, xmlSerializer } from '@src/utils';

/* *** */

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

export type Section = {
   content: string;
   idref: string;
};

/**
 * * What parsed from parser
 */
export type Book = {
   cover: Blob;
   metadata: {
      title: string;
      creator: string;
      publisher: string;
      language: string;
   };
   sections: Section[];

   totalCharacters: number;
   images: Record<string, Blob>;
};

let defaultCoverBlob: Blob | null = null;

async function getDefaultCoverBlob(): Promise<Blob> {
   if (defaultCoverBlob) return Promise.resolve(defaultCoverBlob);

   const defaultCoverUrl = new URL('@src/assets/default-book-cover.jpeg', import.meta.url).href;
   defaultCoverBlob = await fetch(defaultCoverUrl).then((res) => res.blob());
   if (!defaultCoverBlob) {
      console.warn('[Epub] Failed to fetch default cover image, using empty Blob instead.');
      defaultCoverBlob = new Blob();
   }

   return defaultCoverBlob;
}

export class EpubParser {
   constructor(private file: File) {}

   static parse(file: File): Promise<Book> {
      return new EpubParser(file).parse();
   }

   async parse(): Promise<Book> {
      const [book, error] = await unwrapAsync(makeBook(this.file));
      if (error) {
         throw new EpubParsingError(`Failed to parse EPUB file: ${error.message}`);
      }

      const archive = book.archive;
      const manifest = book.manifest;
      const spine = book.spine;

      // ! <image src, Blob>
      const images: Record<string, Blob> = {};

      // todo: might refactor if feel like it, too lazy rn >.<
      const processImageTags = (body: Element, chapterPath: string): Element => {
         // * <img> tags
         for (const imageEl of body.getElementsByTagName('img')) {
            const src = imageEl.getAttribute('src');
            if (!src) {
               console.warn('<img> tag missing src attribute, skipping:', imageEl);
               continue;
            }

            const resolvedSrc = resolvePath(chapterPath, src);
            if (!resolvedSrc) continue;

            const buffer = archive[resolvedSrc];
            if (!buffer) {
               console.warn(`Image not found in archive: ${resolvedSrc}`);
               continue;
            }

            const mimeType = getMimeType(resolvedSrc);
            const blob = new Blob([buffer as Uint8Array<ArrayBuffer>], { type: mimeType });

            if (resolvedSrc in images) {
               console.warn(
                  `Duplicate image src found: ${resolvedSrc}, overwriting previous Blob.`,
               );
            }

            images[resolvedSrc] = blob;
            imageEl.setAttribute('src', resolvedSrc);
         }

         // * <svg:image> tags
         for (const svgImageEl of body.getElementsByTagNameNS(SVG_NS, 'image')) {
            const src = svgImageEl.getAttribute('href')
               ?? svgImageEl.getAttributeNS(XLINK_NS, 'href')
               ?? svgImageEl.getAttribute('xlink:href');

            if (!src) {
               console.warn('<svg:image> tag missing href attribute, skipping:', svgImageEl);
               continue;
            }

            const resolvedSrc = resolvePath(chapterPath, src);
            if (!resolvedSrc) continue;

            const buffer = archive[resolvedSrc];
            if (!buffer) {
               console.warn(`Image not found in archive: ${resolvedSrc}`);
               continue;
            }

            const mimeType = getMimeType(resolvedSrc);
            const blob = new Blob([buffer as Uint8Array<ArrayBuffer>], { type: mimeType });
            if (resolvedSrc in images) {
               console.warn(
                  `Duplicate image src found: ${resolvedSrc}, overwriting previous Blob.`,
               );
            }

            images[resolvedSrc] = blob;

            // ! Replace the svg wrapper
            const svgWrapper = svgImageEl.closest('svg');
            if (!svgWrapper) break;

            const img = body.ownerDocument.createElement('img');
            img.setAttribute('src', resolvedSrc);

            svgWrapper.replaceWith(img);
         }

         return body;
      };

      let runningCharCount = 0;
      const processBookSections = (): Section[] => {
         const _sections: Section[] = [];
         for (const spineItem of spine) {
            if (!spineItem.linear) { // Skip non-linear cuz im lazy >.<
               console.warn(`Skipping non-linear section: ${spineItem.id}`);
               continue;
            }

            const manifestItem = manifest.get(spineItem.id);
            if (!manifestItem) {
               throw new EpubParsingError(
                  `Manifest item not found for spine item: ${spineItem.id}`,
               );
            }

            if (!(manifestItem.mediaType in SupportedMimeTypes)) {
               throw new EpubParsingError(
                  `Unsupported media type: ${manifestItem.mediaType}`,
               );
            }

            const buffer = archive[manifestItem.href];
            if (!buffer) {
               throw new EpubParsingError(
                  `Buffer not found for manifest item: ${manifestItem.href}`,
               );
            }

            const raw = strFromU8(buffer);
            // 'application/xhtml+xml' cuz don't wanna think too much
            const doc = domParser.parseFromString(
               raw,
               'application/xhtml+xml',
            );

            const body = doc.body
               ?? doc.getElementsByTagName('body')[0]
               ?? doc.getElementsByTagNameNS(XHTML_NS, 'body')[0];

            if (!body) {
               throw new EpubParsingError(
                  `Body element not found for spine item: ${spineItem.id}`,
               );
            }

            const processedBody = processImageTags(body, manifestItem.href);

            const pTags = processedBody.getElementsByTagName('p');
            for (const p of pTags) {
               runningCharCount += getElementCharacterCount(p.innerHTML);
               p.setAttribute('data-characters-read', runningCharCount.toString());
            }

            const content = xmlSerializer.serializeToString(processedBody);

            _sections.push({
               content,
               idref: spineItem.id,
            });
         }
         return _sections;
      };

      return {
         cover: book.cover ?? await getDefaultCoverBlob(),
         metadata: {
            title: book.metadata.title,
            creator: book.metadata.creator ?? 'Unknown',
            publisher: book.metadata.publisher ?? 'Unknown',
            language: book.metadata.language,
         },
         sections: processBookSections(),
         totalCharacters: runningCharCount,
         images,
      };
   }
}

export function getElementCharacterCount(htmlString: string): number {
   // 'text/html' cuz don't wanna think too much
   const doc = domParser.parseFromString(
      htmlString,
      'text/html',
   );

   // Drop noise tags
   for (const element of doc.querySelectorAll('rt, rp, style, script')) element.remove();

   const rawText = doc.body?.textContent ?? '';
   return rawText.match(UNICODE_GLYPH_REGEX)?.length ?? 0;
}

// i don't wanna deal with img so i excluded it
const SupportedMimeTypes = {
   'application/xhtml+xml': true,
   'application/xml': true,
   'text/html': true,
   'text/xml': true,
} as const;

const MIME_MAP: Record<string, string> = {
   jpg: 'image/jpeg',
   jpeg: 'image/jpeg',
   png: 'image/png',
   svg: 'image/svg+xml',
   gif: 'image/gif',
   webp: 'image/webp',
   avif: 'image/avif',
};

// ! AI SLOP ALERT BELOW !
// ? Too lazy to fix, plus it's working >.< ?

function getMimeType(path: string): string {
   const ext = path.split('.').pop()?.toLowerCase() ?? '';
   return MIME_MAP[ext] ?? 'application/octet-stream';
}

/**
 * Collapse `.` and `..` segments in an already-joined path string.
 * Returns `null` if `..` would escape the archive root (instead of throwing).
 */
export function normalizePath(path: string): string | null {
   const stack: string[] = [];
   for (const seg of path.replace(/\\/g, '/').split('/')) {
      if (seg === '' || seg === '.') continue;
      if (seg === '..') {
         if (stack.length === 0) return null;
         stack.pop();
      }
      else {
         stack.push(seg);
      }
   }
   return stack.join('/');
}

const EXTERNAL_URI_RE = /^(?:https?:|data:|blob:)/i;

export function resolvePath(
   basePath: string,
   relativeSrc: string,
): string | null {
   // 1. External / data / blob URIs — nothing to resolve
   if (EXTERNAL_URI_RE.test(relativeSrc)) return null;

   // 2. Strip fragment and query string
   let cleaned = relativeSrc;
   const hashIdx = cleaned.indexOf('#');
   if (hashIdx !== -1) cleaned = cleaned.slice(0, hashIdx);
   const queryIdx = cleaned.indexOf('?');
   if (queryIdx !== -1) cleaned = cleaned.slice(0, queryIdx);

   // 3. Percent-decode (safe — catch URIError on malformed sequences)
   let raw: string;
   try {
      raw = decodeURIComponent(cleaned);
   }
   catch {
      return null;
   }

   // 4. Already root-relative (absolute path)
   if (raw.startsWith('/')) return normalizePath(raw.slice(1));

   // 5. Derive chapter directory (everything up to and including the last '/')
   const slashIdx = basePath.lastIndexOf('/');
   const chapterDir = slashIdx !== -1 ? basePath.slice(0, slashIdx + 1) : '';

   return normalizePath(chapterDir + raw);
}
