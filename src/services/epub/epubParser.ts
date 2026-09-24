import { makeBook } from '@src/vendor/epub-parser-js/main.ts';
import { strFromU8 } from 'fflate';
import { domParser, tryCatch, xmlSerializer } from '@src/utils';

/* *** */

export class ParsingError extends Error {
   constructor(
      message: string,
      options?: {
         cause?: unknown;
      },
   ) {
      super(message, { cause: options?.cause });
      this.name = 'ParsingError';
   }
}

export type Section = {
   content: string; // ! html string
   idref: string;
   path: string; // ! absolute path in archive
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
   // ! each section contains exactly one <body> tag as html string
   sections: Section[];

   totalCharacters: number;
   images: Record<string, Blob>;
};

// * only letters and numbers
const UNICODE_GLYPH_REGEX = /[\p{L}\p{N}]/gu;

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

/** Module scope */
let defaultCoverBlob: Blob | null = null;

/** does not throw on fail */
async function getDefaultCoverBlob(): Promise<Blob> {
   if (defaultCoverBlob) return Promise.resolve(defaultCoverBlob);

   const defaultCoverUrl = new URL('@src/assets/default-book-cover.jpeg', import.meta.url).href;
   defaultCoverBlob = await fetch(defaultCoverUrl).then((res) => res.blob());

   if (!defaultCoverBlob) {
      console.warn('[Epub] Failed to fetch default cover image.');
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
      const [book, error] = await tryCatch(makeBook(this.file));
      if (error) throw new ParsingError('Failed to parse EPUB file.', { cause: error });

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
               console.warn('[Epub] <img> tag missing src attribute, skipping:', imageEl);
               continue;
            }

            const resolvedSrc = resolvePath(src, chapterPath);
            if (!resolvedSrc) continue;

            const buffer = archive[resolvedSrc];
            if (!buffer) {
               console.warn(`[Epub] Image not found in archive: ${resolvedSrc}`);
               continue;
            }

            const mimeType = getMimeType(resolvedSrc);
            const blob = new Blob([buffer as Uint8Array<ArrayBuffer>], { type: mimeType });

            if (resolvedSrc in images) {
               console.warn(
                  `[Epub] Duplicate image src found: ${resolvedSrc}, overwriting previous Blob.`,
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
               console.warn('[Epub] <svg:image> missing href, skipping:', svgImageEl);
               continue;
            }

            const resolvedSrc = resolvePath(src, chapterPath);
            if (!resolvedSrc) continue;

            const buffer = archive[resolvedSrc];
            if (!buffer) {
               console.warn(`[Epub] Image not found in archive: ${resolvedSrc}`);
               continue;
            }

            const mimeType = getMimeType(resolvedSrc);
            const blob = new Blob([buffer as Uint8Array<ArrayBuffer>], { type: mimeType });
            if (resolvedSrc in images) {
               console.warn(
                  `[Epub] Duplicate image src found: ${resolvedSrc}, overwriting.`,
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
               console.warn(`[Epub] Skipping non-linear section: ${spineItem.id}`);
               continue;
            }

            const manifestItem = manifest.get(spineItem.id);
            if (!manifestItem) throw new ParsingError('Manifest item not found');

            if (!(manifestItem.mediaType in SupportedMimeTypes)) throw new ParsingError('Unsupported media type');

            const buffer = archive[manifestItem.href];
            if (!buffer) throw new ParsingError('Spine item not found in archive');

            const raw = strFromU8(buffer);
            // 'application/xhtml+xml' cuz don't wanna think too much
            const doc = domParser.parseFromString(
               raw,
               'application/xhtml+xml',
            );

            const bodyEl = doc.body
               ?? doc.getElementsByTagName('body')[0]
               ?? doc.getElementsByTagNameNS(XHTML_NS, 'body')[0];

            if (!bodyEl) throw new ParsingError('No <body> found');

            const processedBodyEl = processImageTags(bodyEl, manifestItem.href);

            // process anchor tags (href paths)
            for (const anchorEl of processedBodyEl.getElementsByTagName('a')) {
               const rawHref = anchorEl.getAttribute('href');
               if (!rawHref) continue;

               // ! to bypass browser path normalization to http://...
               anchorEl.setAttribute('href', resolvePath(rawHref, manifestItem.href));
               // console.log(`[Epub] Resolved anchor href: ${rawHref} -> ${anchorEl.getAttribute('href')}`);
            }

            for (const paragraphEl of processedBodyEl.getElementsByTagName('p')) {
               runningCharCount += getElementCharacterCount(paragraphEl.innerHTML);
               paragraphEl.setAttribute('data-characters-read', runningCharCount.toString());
            }

            _sections.push({
               content: xmlSerializer.serializeToString(processedBodyEl),
               idref: spineItem.id,
               path: manifestItem.href,
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

function getMimeType(path: string): string {
   const ext = path.split('.').pop()?.toLowerCase() ?? '';
   return MIME_MAP[ext] ?? 'application/octet-stream';
}

export const URI_SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:/i;

function resolvePath(relative: string, absolute: string): string {
   // if contains external link
   if (URI_SCHEME_REGEX.test(relative)) return relative;

   const cleanAbsolute = absolute.startsWith('/') ? absolute.substring(1) : absolute;
   const baseUrl = new URL(`/${cleanAbsolute}`, 'https://honomi.pages.dev/');
   const resolvedUrl = new URL(relative, baseUrl);

   const safeDecode = (str: string) => {
      try {
         return decodeURIComponent(str);
      }
      catch {
         // Fallback: if string contains malformed percent characters
         return str;
      }
   };

   // prevent percent-encoding leaks (%20 -> space)
   const normalizedPath = safeDecode(resolvedUrl.pathname.substring(1));

   return resolvedUrl.hash ? `${normalizedPath}${safeDecode(resolvedUrl.hash)}` : normalizedPath;
}
