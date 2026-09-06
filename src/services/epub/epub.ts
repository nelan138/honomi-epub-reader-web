import defaultCoverUrl from '@src/assets/default-book-cover.jpeg';

const response = await fetch(defaultCoverUrl);
const defaultCoverBlob = await response.blob();

import { unzipSync } from 'fflate';
import type {
   EpubBook,
   Idref,
   ManifestItem,
   NavigationItem,
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

function getNavigation(epubContext: EpubContext): NavigationItem[] {
   if (epubContext.version === 3) {
      let navItem = epubContext.manifest.find((item) =>
         item.properties?.includes('nav')
      );

      if (!navItem) {
         navItem = epubContext.manifest.find((item) =>
            item.href.includes('toc')
            && (item.href.endsWith('.xhtml') || item.href.endsWith('.html'))
         );
      }
      if (!navItem) return [];

      const navDocument = getXmlDocument(
         navItem.resolvedHref,
         epubContext.fileArchive,
      );
      return parseEpub3Navigation(navDocument, navItem.resolvedHref);
   }

   // version === 2
   const spineItemElement =
      epubContext.opfDocument.getElementsByTagName('spine')[0];
   const tocId = spineItemElement?.getAttribute('toc');

   let tocItem = tocId
      ? epubContext.manifest.find((item) => item.id === tocId)
      : undefined;

   if (!tocItem) {
      tocItem = epubContext.manifest.find((item) =>
         item.mediaType === 'application/x-dtbncx+xml'
      )
         ?? epubContext.manifest.find((item) =>
            item.href.endsWith('.ncx')
         );
   }

   if (!tocItem) return [];

   const navDocument = getXmlDocument(
      tocItem.resolvedHref,
      epubContext.fileArchive,
   );
   return parseEpub2Navigation(navDocument, tocItem.resolvedHref);
}

function buildContentMap(
   epubContext: EpubContext,
   spine: SpineItem[],
): Map<Idref, RawXTHMLContent> {
   const contentMap = new Map<Idref, RawXTHMLContent>();

   for (const spineItem of spine) {
      const idref = spineItem.idref;

      const manifestItem = epubContext.manifest.find((item) =>
         item.id === idref
      );
      if (!manifestItem) {
         contentMap.set(idref, `<p>Error: ${idref} not found</p>`);
         continue;
      }

      const chapterPath = manifestItem.resolvedHref;
      const fileData = epubContext.fileArchive[chapterPath];

      if (!fileData) {
         contentMap.set(idref, `<p>Error: File missing</p>`);
         continue;
      }

      const rawXhtml = new TextDecoder('utf-8').decode(fileData);
      const doc = new DOMParser().parseFromString(
         rawXhtml,
         'application/xhtml+xml',
      );

      if (doc.getElementsByTagName('parsererror').length > 0) {
         console.error(`Invalid XML in EPUB entry: ${chapterPath}`);
         contentMap.set(idref, `<p>Error parsing chapter.</p>`);
         continue;
      }

      const body = doc.querySelector('body');

      contentMap.set(idref, body ? body.innerHTML : '');
   }

   return contentMap;
}

function parseEpub3Navigation(
   navDocument: Document,
   navPath: string,
): NavigationItem[] {
   const navElements = navDocument.getElementsByTagName('nav');
   let tocNav: Element | null = null;

   for (const nav of navElements) {
      const epubType = nav.getAttributeNS(
         'http://www.idpf.org/2007/ops',
         'type',
      );
      if (epubType?.split(/\s+/).includes('toc')) {
         tocNav = nav;
         break;
      }
   }

   if (!tocNav) return [];

   const parseOl = (ol: Element): NavigationItem[] => {
      const items: NavigationItem[] = [];
      for (const li of ol.children) {
         if (li.localName !== 'li') continue;

         const anchor = li.querySelector('a');
         if (!anchor) continue;

         const label = anchor.textContent?.trim() ?? '';
         const href = anchor.getAttribute('href') ?? '';
         const [hrefPath, fragment] = href.split('#');
         const resolvedHref = resolvePath(navPath, hrefPath!);

         const item: NavigationItem = {
            label,
            href,
            resolvedHref,
            fragment: fragment,
            children: [],
         };

         const childOl = li.querySelector('ol');
         if (childOl) item.children = parseOl(childOl);

         items.push(item);
      }
      return items;
   };

   const rootOl = tocNav.querySelector('ol');
   return rootOl ? parseOl(rootOl) : [];
}

function parseEpub2Navigation(
   tocDocument: Document,
   tocPath: string,
): NavigationItem[] {
   const navMap = tocDocument.getElementsByTagName('navMap')[0];
   if (!navMap) return [];

   const parseNavPoints = (parent: Element): NavigationItem[] => {
      const items: NavigationItem[] = [];
      for (const navPoint of parent.children) {
         if (navPoint.localName !== 'navPoint') continue;

         const label = navPoint.getElementsByTagName('navLabel')[0]
            ?.getElementsByTagName('text')[0]
            ?.textContent?.trim() ?? '';

         const contentSrc =
            navPoint.getElementsByTagName('content')[0]?.getAttribute('src')
               ?? '';

         const [hrefPath, fragment] = contentSrc.split('#');
         const resolvedHref = resolvePath(tocPath, hrefPath!);

         const item: NavigationItem = {
            label,
            href: contentSrc,
            resolvedHref,
            fragment: fragment,
            children: [],
         };

         if (
            [...navPoint.children].some((el) => el.localName === 'navPoint')
         ) { item.children = parseNavPoints(navPoint); }

         items.push(item);
      }
      return items;
   };

   return parseNavPoints(navMap);
}

/**
 * Represents an EPUB, only has data parsed from its content.
 */
export class Epub {
   static async parse(epubFile: Blob): Promise<EpubBook> {
      const buffer = await epubFile.arrayBuffer();
      const fileArchive = unzipSync(new Uint8Array(buffer));

      const epubContext = createEpubContext(fileArchive);

      const metadata = getMetadata(epubContext);
      const spine = getSpine(epubContext);
      const navigation = getNavigation(epubContext);
      const spineItemContentMap = buildContentMap(epubContext, spine);

      const epubBook: EpubBook = {
         ...metadata,
         spine,
         navigation,
         assets: fileArchive,
         spineItemContentMap,
      };

      return epubBook;
   }
}
