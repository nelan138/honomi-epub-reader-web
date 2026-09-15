import { makeBook } from '@src/vendor/epub-parser-js/index.ts';
import { EpubParsingError } from '@src/types.ts';
import { strFromU8 } from 'fflate';
import { UNICODE_GLYPH_REGEX } from '@src/utilities.ts';

export type Section = {
   content: string;
   idref: string;
};

export type Book = {
   cover: Blob | null;
   metadata: {
      title: string;
      creator: string;
      publisher: string;
      language: string;
   };
   sections: Section[];

   charCount: number;
   images: Map<string, Blob>;
};

export class EpubParser {
   constructor(private file: File) {}

   static parse(file: File): Promise<Book> {
      return new EpubParser(file).parse();
   }

   async parse(): Promise<Book> {
      const book = await makeBook(this.file);

      const archive = book.archive;
      const manifest = book.manifest;
      const spine = book.spine;

      const domParser = new DOMParser();

      const images = new Map<string, Blob>();

      const processImageTags = (
         body: Element,
         chapterPath: string,
      ): Element => {
         const processImage = (
            element: Element,
            rawSrc: string,
         ) => {
            // resolvePath returns null for external/data/blob URIs,
            // malformed percent sequences, or root-escaping paths — skip.
            const resolvedSrc = resolvePath(chapterPath, rawSrc);
            if (!resolvedSrc) return;

            const buffer = archive[resolvedSrc];
            if (!buffer) {
               console.warn(`Image not found in archive: ${resolvedSrc}`);
               return;
            }

            if (!images.has(resolvedSrc)) {
               const mimeType = getMimeType(resolvedSrc);
               const buf = buffer.buffer.slice(
                  buffer.byteOffset,
                  buffer.byteOffset + buffer.byteLength,
               );
               const blob = new Blob([buf as BlobPart], { type: mimeType });
               images.set(resolvedSrc, blob);
            }

            element.setAttribute('src', resolvedSrc);
         };

         for (const img of body.getElementsByTagName('img')) {
            const src = img.getAttribute('src');
            if (!src) continue;
            try {
               processImage(img, src);
            }
            catch (e) {
               console.warn(`Failed to process <img> src="${src}":`, e);
            }
         }

         // SVG <image> — resolve src, then replace the <svg> wrapper with a plain <img>.
         // Collect into a static array first because the live NodeList would shift
         // during DOM mutations.
         const svgImages = Array.from(
            body.getElementsByTagNameNS('http://www.w3.org/2000/svg', 'image'),
         );
         for (const svgImg of svgImages) {
            const src = svgImg.getAttribute('href')
               ?? svgImg.getAttributeNS('http://www.w3.org/1999/xlink', 'href')
               ?? svgImg.getAttribute('xlink:href');
            if (!src) continue;

            const resolvedSrc = resolvePath(chapterPath, src);
            if (!resolvedSrc) continue;

            const buffer = archive[resolvedSrc];
            if (!buffer) {
               console.warn(`Image not found in archive: ${resolvedSrc}`);
               continue;
            }

            if (!images.has(resolvedSrc)) {
               const mimeType = getMimeType(resolvedSrc);
               const buf = buffer.buffer.slice(
                  buffer.byteOffset,
                  buffer.byteOffset + buffer.byteLength,
               );
               const blob = new Blob([buf as BlobPart], { type: mimeType });
               images.set(resolvedSrc, blob);
            }

            // Replace the closest <svg> ancestor (or the <image> itself) with <img>
            const svgWrapper = svgImg.closest('svg') ?? svgImg;
            const img = body.ownerDocument.createElement('img');
            img.setAttribute('src', resolvedSrc);
            svgWrapper.parentNode?.replaceChild(img, svgWrapper);
         }

         return body;
      };

      const processBookSections = (): Section[] => {
         const sections: Section[] = [];
         for (const spineItem of spine) {
            if (!spineItem.linear) { // Skip non-linear sections
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

            const doc = domParser.parseFromString(
               raw,
               'application/xhtml+xml',
            );

            const body = doc.body
               ?? doc.getElementsByTagName('body')[0]
               ?? doc.getElementsByTagNameNS(
                  'http://www.w3.org/1999/xhtml',
                  'body',
               )[0];
            if (!body) {
               throw new EpubParsingError(
                  `Body element not found for spine item: ${spineItem.id}`,
               );
            }

            const processedBody = processImageTags(body, manifestItem.href);
            const serialize = new XMLSerializer();
            const content = serialize.serializeToString(processedBody);
            sections.push({
               content,
               idref: spineItem.id,
            });
         }
         return sections;
      };

      const sections = processBookSections();

      const charCount = sections.reduce((acc, section) => {
         const doc = domParser.parseFromString(
            section.content,
            'text/html',
         );

         // Drop ruby annotations and noise tags before counting
         const dropElements = doc.querySelectorAll('rt, rp, style, script');
         for (const el of dropElements) el.remove();

         const rawText = doc.body?.textContent ?? '';
         return acc + (rawText.match(UNICODE_GLYPH_REGEX)?.length ?? 0);
      }, 0);

      return {
         cover: book.cover ?? null,
         metadata: {
            title: book.metadata.title,
            creator: book.metadata.creator ?? 'Unknown',
            publisher: book.metadata.publisher ?? 'Unknown',
            language: book.metadata.language,
         },
         sections,
         charCount,
         images,
      };
   }
}

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
