import { strFromU8, unzipSync } from 'fflate';
import {
   type Book,
   EpubParsingError,
   type Idref,
   type RawXTHMLContent,
   type ResolvedPath,
   type SpineItem,
} from '@src/types';
import {
   getElementText,
   getXmlDocument,
   normalizePath,
   resolvePath,
   UNICODE_GLYPH_REGEX,
   unwrapAsync,
} from '@src/utilities';

import defaultCoverUrl from '@src/assets/default-book-cover.jpeg';

type Path = string;

type Metadata = {
   title: string;
   creator: string;
   publisher: string;
   language: string;
   cover: Blob;
};

type ManifestItem = {
   href: Path;
   id: Idref;
   resolvedHref: ResolvedPath;
   mediaType: string;
   properties?: string[];
};

type EpubContext = {
   fileArchive: Record<string, Uint8Array>;
   opfPath: ResolvedPath;
   opfDocument: Document;
   manifest: ManifestItem[];
   version: 2 | 3;
};
let defaultCoverBlobCache: Blob | null = null;

async function getDefaultCoverBlob(): Promise<Blob> {
   if (defaultCoverBlobCache) return defaultCoverBlobCache;

   const [response, EpubParsingError] = await unwrapAsync(
      fetch(defaultCoverUrl),
   );
   if (response) defaultCoverBlobCache = await response.blob();
   else {
      console.warn(
         '[Epub] Failed to load default book cover:',
         EpubParsingError.message,
      );
      defaultCoverBlobCache = new Blob([]);
   }
   return defaultCoverBlobCache;
}

function getOpfPath(fileArchive: Record<string, Uint8Array>): ResolvedPath {
   const containerDocument = getXmlDocument(
      'META-INF/container.xml',
      fileArchive,
   );
   const rootfile = containerDocument.getElementsByTagName('rootfile')[0];
   const opfPath = rootfile?.getAttribute('full-path') as ResolvedPath;

   if (!opfPath) {
      throw new EpubParsingError(
         'container.xml does not define OPF package path',
      );
   }

   return normalizePath(opfPath);
}

function getManifest(
   opfDocument: Document,
   opfPath: ResolvedPath,
): ManifestItem[] {
   const manifestElement = opfDocument.getElementsByTagName('manifest')[0];
   if (!manifestElement)
      throw new EpubParsingError('package does not contain a manifest');

   const manifestItemElements = [...manifestElement.children].filter(
      (element) => element.localName === 'item',
   );

   return manifestItemElements.map((item) => {
      const id: Idref | null = item.getAttribute('id');
      const href: Path | null = item.getAttribute('href');
      const mediaType = item.getAttribute('media-type');

      if (!id || !href || !mediaType) {
         throw new EpubParsingError(
            'manifest item missing required attributes',
         );
      }

      const propertiesAttribute = item.getAttribute('properties')?.trim();

      return {
         id,
         href,
         resolvedHref: resolvePath(opfPath, href),
         mediaType,
         properties: propertiesAttribute
            ? propertiesAttribute.split(/\s+/)
            : [],
      };
   });
}

function getVersion(opfDocument: Document): 2 | 3 {
   const packageElement = opfDocument.getElementsByTagName('package')[0];
   const versionString = packageElement?.getAttribute('version');

   if (!versionString)
      throw new EpubParsingError('EPUB package does not define a version');

   const version = parseInt(versionString, 10);
   if (version !== 2 && version !== 3)
      throw new EpubParsingError(`Unsupported EPUB version: ${versionString}`);

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
   if (!spineElement)
      throw new EpubParsingError('EPUB package does not contain a spine');

   const spineItemElements = [...spineElement.children].filter(
      (element) => element.localName === 'itemref',
   );

   return spineItemElements.map((itemref): SpineItem => {
      const idref = itemref.getAttribute('idref');
      if (!idref)
         throw new EpubParsingError('EPUB spine item does not define an idref');

      const manifestItem = epubContext.manifest.find((item) =>
         item.id === idref
      );
      if (!manifestItem) {
         throw new EpubParsingError(
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
}

async function getCover(epubContext: EpubContext): Promise<Blob> {
   let coverItem: ManifestItem | undefined;

   if (epubContext.version === 3) {
      coverItem = epubContext.manifest.find((item) =>
         item.properties?.includes('cover-image')
      );
   }

   if (!coverItem) {
      const coverId = [...epubContext.opfDocument.getElementsByTagName('meta')]
         .find((meta) => meta.getAttribute('name') === 'cover')
         ?.getAttribute('content');

      if (coverId)
         coverItem = epubContext.manifest.find((item) => item.id === coverId);
   }

   if (!coverItem) return await getDefaultCoverBlob();

   const coverData = epubContext.fileArchive[coverItem.resolvedHref];
   if (!coverData) return await getDefaultCoverBlob();

   return new Blob([new Uint8Array(coverData)], { type: coverItem.mediaType });
}

async function getMetadata(epubContext: EpubContext): Promise<Metadata> {
   const metadataElement = epubContext.opfDocument.getElementsByTagName(
      'metadata',
   )[0];
   if (!metadataElement) {
      return {
         title: 'No title',
         creator: 'Unknown',
         publisher: 'Unknown',
         language: '',
         cover: await getDefaultCoverBlob(),
      };
   }

   return {
      title: getElementText(metadataElement, 'title') || 'No title',
      creator: getElementText(metadataElement, 'creator') || 'Unknown',
      publisher: getElementText(metadataElement, 'publisher') || 'Unknown',
      language: getElementText(metadataElement, 'language') || '',
      cover: await getCover(epubContext),
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
         totalCount += text.match(UNICODE_GLYPH_REGEX)?.length ?? 0;
      }
   }

   return totalCount;
}

/**
 * Parses an EPUB Blob and extracts its content, metadata, and character count.
 */
export async function parseEpub(epubFile: Blob): Promise<Book> {
   const buffer = await epubFile.arrayBuffer();
   const fileArchive = unzipSync(new Uint8Array(buffer));

   const epubContext = createEpubContext(fileArchive);

   const metadata = await getMetadata(epubContext);
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
