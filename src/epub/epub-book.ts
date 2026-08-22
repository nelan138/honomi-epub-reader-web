import type { BookRecord } from '../database/book-repository.ts';
import { strFromU8, unzipSync } from 'fflate';

type Path = string;
type ResourcePath = string;
type ManifestItemId = string;

export interface ManifestItem {
   href: Path;
   resolvedPath: ResourcePath;
   mediaType: string;
   properties: string[];
}

export interface SpineItem {
   idref: ManifestItemId;
   linear: boolean; // * false = (footnotes, appendices, etc.)
}

export interface NavigationItem {
   label: string;
   href: Path;
   resolvedPath: ResourcePath;
   fragment?: string; // * Optional fragment identifier (e.g., #section1)
   children?: NavigationItem[];
}

export interface Metadata {
   title?: string;
   creator?: string;
   language?: string;
   publisher?: string;
   identifier?: string;
   description?: string;
   subject?: string[];
}

export default class EpubBook {
   #id?: number;
   #categoryId!: number;

   // Original EPUB data
   #epubFile!: Blob;
   #epubData?: Record<ResourcePath, Uint8Array>;
   #opfPath!: ResourcePath;

   // Parsed EPUB data
   #manifest!: Map<ManifestItemId, ManifestItem>;
   #spine!: SpineItem[];
   #navigation!: NavigationItem[];

   #metadata!: Metadata;
   #cover?: Blob;

   progress = 0;

   constructor() {}

   static async fromFile(file: File): Promise<EpubBook> {
      const book = new EpubBook();

      book.#epubFile = file;

      const buffer = await file.arrayBuffer();
      book.#epubData = unzipSync(new Uint8Array(buffer), {});

      book.#opfPath = book.getOpfPath();
      book.#manifest = book.getManifest();
      book.#spine = book.getSpine();

      book.#navigation = book.getNavigation();
      book.#metadata = book.getMetadata();
      book.#cover = book.getCover() ?? undefined;

      return book;
   }

   static fromRecord(bookRecord: BookRecord): EpubBook {
      const book = new EpubBook();

      book.#id = bookRecord.id;
      book.#categoryId = bookRecord.categoryId;
      book.#epubFile = bookRecord.epubFile;
      book.#opfPath = bookRecord.opfPath;
      book.#manifest = bookRecord.manifest;
      book.#spine = bookRecord.spine;
      book.#navigation = bookRecord.navigation;
      book.#metadata = bookRecord.metadata ?? {
         title: 'No Title',
         creator: 'Unknown',
         publisher: 'Unknown',
         language: '',
         identifier: '',
         description: '',
         subject: [],
      };
      book.#cover = bookRecord.cover;
      book.progress = bookRecord.progress;

      return book;
   }

   setId(id: number): void {
      this.#id = id;
   }

   setCategoryId(id: number): void {
      this.#categoryId = id;
   }

   getId(): number | undefined {
      return this.#id;
   }

   getCategoryId(): number {
      return this.#categoryId;
   }

   setProgress(progress: number): void {
      if (!progress || progress < 0) progress = 0;
      if (progress > 100) progress = 100;
      this.progress = progress;
   }

   /**
    * @returns 0 to 100
    */
   getProgress(): number {
      return this.progress;
   }

   getEpubFile(): Blob {
      return this.#epubFile;
   }

   getOpfPath(): ResourcePath {
      if (this.#opfPath) return this.#opfPath;

      const containerDocument = this.#getXmlDocument('META-INF/container.xml');
      const rootfile = containerDocument.getElementsByTagName('rootfile')[0];
      const opfPath = rootfile?.getAttribute('full-path') as ResourcePath;

      if (!opfPath) throw new Error('EPUB container does not define an OPF package path');
      this.#opfPath = this.#normalizePath(opfPath);
      return this.#opfPath;
   }

   getManifest(): Map<ManifestItemId, ManifestItem> {
      if (this.#manifest) return this.#manifest;

      const opfDocument = this.#getXmlDocument(this.#opfPath);

      const manifestElement = opfDocument.getElementsByTagName('manifest')[0];
      if (!manifestElement) throw new Error('EPUB package does not contain a manifest');

      this.#manifest = new Map<ManifestItemId, ManifestItem>();
      const manifestItemElements = [...manifestElement.children].filter(
         (element) => element.localName === 'item',
      );

      for (const item of manifestItemElements) {
         const id: ManifestItemId | null = item.getAttribute('id');
         if (!id) throw new Error('EPUB manifest item does not define an id');
         if (this.#manifest.has(id)) throw new Error(`Duplicate manifest item id: ${id}`);

         const href: Path | null = item.getAttribute('href');
         if (!href) throw new Error('EPUB manifest item does not define an href');

         const mediaType = item.getAttribute('media-type');
         if (!mediaType) throw new Error('EPUB manifest item does not define a media-type');

         const propertiesAttribute = item.getAttribute('properties')?.trim();

         const properties = propertiesAttribute ? propertiesAttribute.split(/\s+/) : [];

         const manifestItem: ManifestItem = {
            href,
            resolvedPath: this.#resolvePath(this.#opfPath, href),
            mediaType,
            properties,
         };

         this.#manifest.set(id, manifestItem);
      }
      return this.#manifest;
   }

   getSpine(): SpineItem[] {
      if (this.#spine) return this.#spine;

      const opfDocument = this.#getXmlDocument(this.#opfPath);

      const spineElement = opfDocument.getElementsByTagName('spine')[0];
      if (!spineElement) throw new Error('EPUB package does not contain a spine');

      const spineItemElements = [...spineElement.children].filter(
         (element) => element.localName === 'itemref',
      );

      this.#spine = Array.from(spineItemElements, (itemref): SpineItem => {
         const idref = itemref.getAttribute('idref');
         if (!idref) throw new Error('EPUB spine item does not define an idref');

         if (!this.#manifest) this.#manifest = this.getManifest();
         if (!this.#manifest.has(idref))
            throw new Error(`EPUB spine references missing manifest item: ${idref}`);

         return {
            idref,
            linear: itemref.getAttribute('linear') !== 'no',
         };
      });
      return this.#spine;
   }

   getNavigation(): NavigationItem[] {
      if (this.#navigation) return this.#navigation;

      const manifest = this.getManifest();

      const navigationManifestItems = [...manifest.values()].filter((item) =>
         item.properties.includes('nav')
      );

      if (navigationManifestItems.length > 1) {
         throw new Error(
            'EPUB package contains multiple navigation documents',
         );
      }

      const navigationManifestItem = navigationManifestItems[0];

      this.#navigation = navigationManifestItem
         ? this.#getEPUB3Navigation(navigationManifestItem)
         : this.#getEPUB2Navigation(manifest);

      return this.#navigation;
   }

   #getEPUB3Navigation(
      navigationManifestItem: ManifestItem,
   ): NavigationItem[] {
      const EPUB_NAMESPACE = 'http://www.idpf.org/2007/ops';

      const navigationDocument = this.#getXmlDocument(
         navigationManifestItem.resolvedPath,
      );

      const navElements = Array.from(
         navigationDocument.getElementsByTagName('nav'),
      );

      const tocElements = navElements.filter(
         (nav) => nav.getAttributeNS(EPUB_NAMESPACE, 'type') === 'toc',
      );

      if (tocElements.length === 0) {
         throw new Error(
            'EPUB 3 navigation document does not contain <nav epub:type="toc">',
         );
      }

      if (tocElements.length > 1) {
         throw new Error(
            'EPUB 3 navigation document contains multiple <nav epub:type="toc"> elements',
         );
      }

      const toc = tocElements[0];

      if (!toc) {
         throw new Error(
            'EPUB 3 table of contents navigation element is missing',
         );
      }

      const list = [...toc.children].find(
         (element) => element.localName === 'ol',
      );

      if (!list) {
         throw new Error(
            'EPUB 3 table of contents navigation does not contain a direct <ol>',
         );
      }

      const basePath = navigationManifestItem.resolvedPath;

      const parseList = (parent: Element): NavigationItem[] => {
         return [...parent.children]
            .filter((element) => element.localName === 'li')
            .map((li) => {
               const link = [...li.children].find(
                  (element) =>
                     element.localName === 'a'
                     || element.localName === 'span',
               );

               if (!link) {
                  throw new Error(
                     'EPUB 3 table of contents contains an <li> without a direct <a> or <span>',
                  );
               }

               const href = link.localName === 'a' ? link.getAttribute('href') ?? '' : '';

               const nestedList = [...li.children].find(
                  (element) => element.localName === 'ol',
               );

               if (link.localName === 'span' && !nestedList) {
                  throw new Error(
                     'EPUB 3 table of contents contains a <span> without a nested <ol>',
                  );
               }

               const label = link.textContent?.trim()
                  || li.textContent?.trim()
                  || '';

               const children = nestedList ? parseList(nestedList) : undefined;

               return this.#createNavigationItem(
                  label,
                  href,
                  basePath,
                  children,
               );
            });
      };

      return parseList(list);
   }

   #getEPUB2Navigation(manifest: Map<ManifestItemId, ManifestItem>): NavigationItem[] {
      const opfDocument = this.#getXmlDocument(this.#opfPath);

      const spine = opfDocument.getElementsByTagName('spine')[0];

      if (!spine) throw new Error('EPUB package does not contain a spine');

      const ncxId = spine.getAttribute('toc');

      if (!ncxId) {
         throw new Error(
            'EPUB 2 spine does not contain a toc attribute referencing an NCX',
         );
      }

      const ncxManifestItem = manifest.get(ncxId);

      if (!ncxManifestItem) {
         throw new Error(
            `EPUB spine references missing NCX item: ${ncxId}`,
         );
      }

      if (ncxManifestItem.mediaType !== 'application/x-dtbncx+xml') {
         throw new Error(
            `EPUB spine toc reference is not an NCX file: ${ncxId}`,
         );
      }

      const ncxDocument = this.#getXmlDocument(
         ncxManifestItem.resolvedPath,
      );

      const navMap = ncxDocument.getElementsByTagName('navMap')[0];

      if (!navMap) {
         throw new Error(
            'EPUB NCX document does not contain a navMap',
         );
      }

      const basePath = ncxManifestItem.resolvedPath;

      const parseNavPoints = (
         parent: Element,
      ): NavigationItem[] => {
         return [...parent.children]
            .filter((element) => element.localName === 'navPoint')
            .map((navPoint) => {
               const navLabel = [...navPoint.children].find(
                  (element) => element.localName === 'navLabel',
               );

               const labelElement = navLabel
                  ? [...navLabel.children].find(
                     (element) => element.localName === 'text',
                  )
                  : undefined;

               if (!labelElement) {
                  throw new Error(
                     'EPUB NCX navPoint does not contain a direct navLabel/text',
                  );
               }

               const content = [...navPoint.children].find(
                  (element) => element.localName === 'content',
               );

               const href = content?.getAttribute('src');

               if (!href) {
                  throw new Error(
                     'EPUB NCX navPoint does not contain content@src',
                  );
               }

               const label = labelElement.textContent?.trim() || '';

               const children = parseNavPoints(navPoint);

               return this.#createNavigationItem(
                  label,
                  href,
                  basePath,
                  children,
               );
            });
      };

      return parseNavPoints(navMap);
   }

   #createNavigationItem(
      label: string,
      href: string,
      basePath: ResourcePath,
      children?: NavigationItem[],
   ): NavigationItem {
      if (!href) {
         return {
            label,
            href: '',
            resolvedPath: '',
            ...(children?.length ? { children } : {}),
         };
      }

      const hashIndex = href.indexOf('#');

      const hrefWithoutFragment = hashIndex === -1 ? href : href.slice(0, hashIndex);

      const fragment = hashIndex === -1 ? undefined : href.slice(hashIndex + 1) || undefined;

      const queryIndex = hrefWithoutFragment.indexOf('?');

      const path = queryIndex === -1
         ? hrefWithoutFragment
         : hrefWithoutFragment.slice(0, queryIndex);

      const resolvedPath = path ? this.#resolvePath(basePath, path) : basePath;

      return {
         label,
         href,
         resolvedPath,
         ...(fragment ? { fragment } : {}),
         ...(children?.length ? { children } : {}),
      };
   }

   getMetadata(): Metadata {
      if (this.#metadata) return this.#metadata;

      const opfDocument = this.#getXmlDocument(this.#opfPath);

      const metadataElement = opfDocument.getElementsByTagName('metadata')[0];
      if (!metadataElement) throw new Error('EPUB package does not contain metadata');

      this.#metadata = {
         title: this.#getElementText(metadataElement, 'title'),
         creator: this.#getElementText(metadataElement, 'creator'),
         language: this.#getElementText(metadataElement, 'language'),
         identifier: this.#getElementText(metadataElement, 'identifier'),
         publisher: this.#getElementText(metadataElement, 'publisher'),
         description: this.#getElementText(metadataElement, 'description'),
         subject: Array.from(
            metadataElement.getElementsByTagNameNS('*', 'subject'),
            (element) => element.textContent?.trim() ?? '',
         ).filter(Boolean),
      };

      return this.#metadata;
   }

   getCover(): Blob | null {
      if (this.#cover) return this.#cover;

      const manifest = this.getManifest();
      const opfDocument = this.#getXmlDocument(this.#opfPath);

      // * EPUB 3
      let coverItem = [...manifest.values()]
         .find((item) => item.properties.includes('cover-image'));

      // * EPUB 2 fall back
      if (!coverItem) {
         const coverId = [...opfDocument.getElementsByTagName('meta')]
            .find((element) => element.getAttribute('name') === 'cover')
            ?.getAttribute('content');

         if (coverId) coverItem = manifest.get(coverId);
      }

      if (!coverItem) return null;

      if (!this.#epubData) throw new Error('EPUB data is not loaded');
      const coverData = this.#epubData[coverItem.resolvedPath];

      if (!coverData) return null;

      this.#cover = new Blob([coverData as BlobPart], {
         type: coverItem.mediaType || 'application/octet-stream',
      });

      return this.#cover;
   }

   #getXmlDocument(path: Path): Document {
      const normalizedPath = this.#normalizePath(path);
      const data = this.#epubData?.[normalizedPath];

      if (!data) throw new Error(`EPUB entry not found: ${normalizedPath}`);

      const xml = strFromU8(data, false);
      const document = new DOMParser().parseFromString(
         xml,
         'application/xml',
      );

      if (document.getElementsByTagName('parsererror').length > 0)
         throw new Error(`Invalid XML in EPUB entry: ${normalizedPath}`);

      return document;
   }

   #getElementText(parent: Element, localName: string): string {
      return (parent.getElementsByTagNameNS('*', localName)[0]
         ?.textContent
         ?.trim() ?? '');
   }

   #resolvePath(basePath: Path, relativePath: Path): ResourcePath {
      const baseParts = this.#normalizePath(basePath).split('/');
      baseParts.pop();

      return this.#normalizePath(
         [...baseParts, relativePath].join('/'),
      );
   }

   #normalizePath(path: Path): Path {
      const parts: string[] = [];
      for (const part of path.replaceAll('\\', '/').split('/')) {
         if (!part || part === '.') continue;

         if (part === '..') {
            if (parts.length === 0)
               throw new Error(`EPUB resource path escapes package root: ${path}`);
            parts.pop();
            continue;
         }
         parts.push(part);
      }
      return parts.join('/');
   }
}
