import defaultCoverUrl from '@src/assets/default-book-cover.jpeg';

const response = await fetch(defaultCoverUrl);
const defaultCoverBlob = await response.blob();

import { strFromU8, unzipSync } from 'fflate';
import type {
   Book,
   Idref,
   ManifestItem,
   Path,
   RawXTHMLContent,
   ResolvedPath,
   SpineItem,
} from '@src/types/book';
import {
   getElementText,
   getXmlDocument,
   normalizePath,
   resolvePath,
   UNICODE_GLYPH_REGEX,
} from '@src/utilities';

type Metadata = {
   title: string;
   creator: string;
   publisher: string;
   language: string;
   cover: Blob;
};

type EpubContext = {
   fileArchive: Record<string, Uint8Array>;
   opfPath: ResolvedPath;
   opfDocument: Document;
   manifest: ManifestItem[];
   version: 2 | 3;
};

function getOpfPath(fileArchive: Record<string, Uint8Array>): ResolvedPath {
   const containerDocument = getXmlDocument(
      'META-INF/container.xml',
      fileArchive,
   );
   const rootfile = containerDocument.getElementsByTagName('rootfile')[0];
   const opfPath = rootfile?.getAttribute('full-path') as ResolvedPath;

   if (!opfPath)
      throw new Error('EPUB container does not define an OPF package path');

   return normalizePath(opfPath);
}

function getManifest(
   opfDocument: Document,
   opfPath: ResolvedPath,
): ManifestItem[] {
   const manifestElement = opfDocument.getElementsByTagName('manifest')[0];
   if (!manifestElement)
      throw new Error('EPUB package does not contain a manifest');

   const manifest: ManifestItem[] = [];

   const manifestItemElements = [...manifestElement.children].filter(
      (element) => element.localName === 'item',
   );

   for (const item of manifestItemElements) {
      const id: Idref | null = item.getAttribute('id');
      if (!id) throw new Error('EPUB manifest item does not define id');

      const href: Path | null = item.getAttribute('href');
      if (!href) throw new Error('EPUB manifest item does not define href');

      const mediaType = item.getAttribute('media-type');
      if (!mediaType)
         throw new Error('EPUB manifest item does not define media-type');

      const propertiesAttribute = item.getAttribute('properties')?.trim();

      const properties = propertiesAttribute
         ? propertiesAttribute.split(/\s+/)
         : [];

      const manifestItem: ManifestItem = {
         id,
         href,
         resolvedHref: resolvePath(opfPath, href),
         mediaType,
         properties,
      };

      manifest.push(manifestItem);
   }
   return manifest;
}

function getVersion(opfDocument: Document): 2 | 3 {
   const packageElement = opfDocument.getElementsByTagName('package')[0];
   const versionString = packageElement?.getAttribute('version');

   if (!versionString)
      throw new Error('EPUB package does not define a version');

   const version = parseInt(versionString, 10);
   if (version !== 2 && version !== 3)
      throw new Error(`Unsupported EPUB version: ${versionString}`);

   return version as 2 | 3;
}

function createEpubContext(
   fileArchive: Record<string, Uint8Array>,
): EpubContext {
   const opfPath = getOpfPath(fileArchive);
   const opfDocument = getXmlDocument(opfPath, fileArchive);
   const manifest = getManifest(opfDocument, opfPath);
   const version = getVersion(opfDocument);

   return { fileArchive, opfPath, opfDocument, manifest, version };
}

function getSpine(epubContext: EpubContext): SpineItem[] {
   const spineElement =
      epubContext.opfDocument.getElementsByTagName('spine')[0];
   if (!spineElement) throw new Error('EPUB package does not contain a spine');

   const spineItemElements = [...spineElement.children].filter(
      (element) => element.localName === 'itemref',
   );

   const spine = Array.from(spineItemElements, (itemref): SpineItem => {
      const idref = itemref.getAttribute('idref');
      if (!idref) throw new Error('EPUB spine item does not define an idref');

      const manifestItem = epubContext.manifest.find((item) =>
         item.id === idref
      );
      if (!manifestItem) {
         throw new Error(
            `EPUB spine item references a manifest item that does not exist: ${idref}`,
         );
      }

      return {
         idref,
         mediaType: manifestItem.mediaType,
         resolvedHref: manifestItem.resolvedHref,
         linear: itemref.getAttribute('linear') !== 'no',
      };
   });
   return spine;
}

function getCover(epubContext: EpubContext): Blob {
   let coverItem: ManifestItem | undefined;

   // * EPUB 3 check
   if (epubContext.version === 3) {
      coverItem = epubContext.manifest.find((item) =>
         item.properties?.includes('cover-image')
      );
   }

   // * EPUB 2 check & EPUB 3 fallback
   if (!coverItem) {
      const coverId = [...epubContext.opfDocument.getElementsByTagName('meta')]
         .find((meta) => meta.getAttribute('name') === 'cover')
         ?.getAttribute('content');

      if (coverId)
         coverItem = epubContext.manifest.find((item) => item.id === coverId);
   }

   if (!coverItem) return defaultCoverBlob;

   const coverData = epubContext.fileArchive[coverItem.resolvedHref];
   if (!coverData) return defaultCoverBlob;

   return new Blob([new Uint8Array(coverData)], { type: coverItem.mediaType });
}

function getMetadata(epubContext: EpubContext): Metadata {
   const metadataElement = epubContext.opfDocument.getElementsByTagName(
      'metadata',
   )[0];
   if (!metadataElement) {
      return {
         title: 'No title',
         creator: 'Unknown',
         publisher: 'Unknown',
         language: '',
         cover: defaultCoverBlob,
      };
   }

   return {
      title: getElementText(metadataElement, 'title') || 'No title',
      creator: getElementText(metadataElement, 'creator') || 'Unknown',
      publisher: getElementText(metadataElement, 'publisher') || 'Unknown',
      language: getElementText(metadataElement, 'language') || '',
      cover: getCover(epubContext),
   };
}

function buildContentMap(
   epubContext: EpubContext,
   spine: SpineItem[],
): Map<Idref, RawXTHMLContent> {
   const contentMap = new Map<Idref, RawXTHMLContent>();

   for (const spineItem of spine) {
      if (!spineItem.linear) continue;

      const fileData = epubContext.fileArchive[spineItem.resolvedHref];
      if (!fileData) continue;

      const rawXhtml = strFromU8(fileData);

      contentMap.set(spineItem.idref, rawXhtml as RawXTHMLContent);
   }

   return contentMap;
}

function getTotalCharacterCount(
   spineItemContentMap: Map<Idref, RawXTHMLContent>,
): number {
   let totalCount = 0;
   const parser = new DOMParser();

   for (const rawContent of spineItemContentMap.values()) {
      const doc = parser.parseFromString(rawContent, 'application/xhtml+xml');
      const paragraphs = doc.querySelectorAll('p');

      for (const p of paragraphs) {
         const clone = p.cloneNode(true) as HTMLElement;
         clone.querySelectorAll('rt, rp').forEach((el) => el.remove());

         const text = clone.textContent ?? '';
         const count = text.match(UNICODE_GLYPH_REGEX)?.length ?? 0;
         totalCount += count;
      }
   }

   return totalCount;
}

/**
 * Represents an EPUB, only has data parsed from its content.
 */
export class Epub {
   static async parse(epubFile: Blob): Promise<Book> {
      const buffer = await epubFile.arrayBuffer();
      const fileArchive = unzipSync(new Uint8Array(buffer));

      const epubContext = createEpubContext(fileArchive);

      const metadata = getMetadata(epubContext);
      const spine = getSpine(epubContext);
      const spineItemContentMap = buildContentMap(epubContext, spine);
      const totalCharacterCount = getTotalCharacterCount(spineItemContentMap);

      const book: Book = {
         ...metadata,
         spine,
         assets: fileArchive,
         spineItemContentMap,
         totalCharacterCount,
      };

      return book;
   }
}
