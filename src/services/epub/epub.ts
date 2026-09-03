import { strFromU8, unzipSync } from 'fflate';
import type {
   ManifestItem,
   ManifestItemId,
   Metadata,
   NavigationItem,
   Path,
   ResourcePath,
   SpineItem,
   SupportedEpubVersion,
} from '@src/types/epub';

/**
 * Represents an EPUB, only has data parsed from its content.
 */
export class EpubBook {
   private epubFile: Blob;
   private epubData?: Record<ResourcePath, Uint8Array>;

   // Epub Data
   private version!: SupportedEpubVersion;
   private opfPath!: ResourcePath;

   private manifest!: Map<ManifestItemId, ManifestItem>;
   private spine!: SpineItem[];
   private navigation!: NavigationItem[];

   private metadata!: Metadata;
   private cover?: Blob;

   constructor(file: File) {
      this.epubFile = file;
   }

   async parse(): Promise<void> {
      if (!this.epubFile) throw new Error("EpubBook file isn't set");

      const buffer = await this.epubFile.arrayBuffer();
      this.epubData = unzipSync(new Uint8Array(buffer), {});

      this.version = this.getVersion();
      this.opfPath = this.getOpfPath();

      this.manifest = this.getManifest();
      this.spine = this.getSpine();
      this.navigation = this.getNavigation();

      this.metadata = this.getMetadata() ?? {
         title: 'No title',
         creator: 'Unknown',
         language: 'Unknown',
      };
      this.cover = this.getCover();
   }

   getEpubFile(): Blob {
      return this.epubFile;
   }

   getVersion(): SupportedEpubVersion {
      if (this.version) return this.version;

      const opfDocument = this.#getXmlDocument(this.getOpfPath());
      const packageElement = opfDocument.getElementsByTagName('package')[0];

      const version = packageElement?.getAttribute('version');
      if (!version) throw new Error('EPUB container does not define a version');

      const supportedVersion = parseInt(version);
      if (supportedVersion !== 2 && supportedVersion !== 3) throw new Error(`Unsupported EPUB version: ${version}`);

      this.version = supportedVersion as SupportedEpubVersion;

      return this.version;
   }

   getOpfPath(): ResourcePath {
      if (this.opfPath) return this.opfPath;

      const containerDocument = this.#getXmlDocument('META-INF/container.xml');
      const rootfile = containerDocument.getElementsByTagName('rootfile')[0];
      const opfPath = rootfile?.getAttribute('full-path') as ResourcePath;

      if (!opfPath) throw new Error('EPUB container does not define an OPF package path');
      this.opfPath = this.#normalizePath(opfPath);

      return this.opfPath;
   }

   getManifest(): Map<ManifestItemId, ManifestItem> {
      if (this.manifest) return this.manifest;

      const opfDocument = this.#getXmlDocument(this.getOpfPath());

      const manifestElement = opfDocument.getElementsByTagName('manifest')[0];
      if (!manifestElement) throw new Error('EPUB package does not contain a manifest');

      this.manifest = new Map<ManifestItemId, ManifestItem>();

      const manifestItemElements = [...manifestElement.children].filter(
         (element) => element.localName === 'item',
      );

      for (const item of manifestItemElements) {
         const id: ManifestItemId | null = item.getAttribute('id');
         if (!id) throw new Error('EPUB manifest item does not define an id');
         if (this.manifest.has(id)) throw new Error(`Duplicate manifest item id: ${id}`);

         const href: Path | null = item.getAttribute('href');
         if (!href) throw new Error('EPUB manifest item does not define an href');

         const mediaType = item.getAttribute('media-type');
         if (!mediaType) throw new Error('EPUB manifest item does not define a media-type');

         const propertiesAttribute = item.getAttribute('properties')?.trim();

         const properties = propertiesAttribute ? propertiesAttribute.split(/\s+/) : [];

         const manifestItem: ManifestItem = {
            href,
            resolvedPath: this.#resolvePath(this.opfPath, href),
            mediaType,
            properties,
         };

         this.manifest.set(id, manifestItem);
      }
      return this.manifest;
   }

   getSpine(): SpineItem[] {
      if (this.spine) return this.spine;

      const opfDocument = this.#getXmlDocument(this.getOpfPath());

      const spineElement = opfDocument.getElementsByTagName('spine')[0];
      if (!spineElement) throw new Error('EPUB package does not contain a spine');

      const spineItemElements = [...spineElement.children].filter(
         (element) => element.localName === 'itemref',
      );

      this.spine = Array.from(spineItemElements, (itemref): SpineItem => {
         const idref = itemref.getAttribute('idref');
         if (!idref) throw new Error('EPUB spine item does not define an idref');

         if (!this.manifest) this.manifest = this.getManifest();
         if (!this.manifest.has(idref)) throw new Error(`EPUB spine references missing manifest item: ${idref}`);

         return {
            idref,
            linear: itemref.getAttribute('linear') !== 'no',
         };
      });
      return this.spine;
   }

   getMetadata(): Metadata {
      if (this.metadata) return this.metadata;

      const opfDocument = this.#getXmlDocument(this.getOpfPath());

      const metadataElement = opfDocument.getElementsByTagName('metadata')[0];
      if (!metadataElement) {
         return {
            title: 'No title',
            creator: 'Unknown',
            language: 'Unknown',
            publisher: 'Unknown',
            identifier: undefined,
            description: undefined,
            subject: undefined,
         };
      }

      this.metadata = {
         title: this.#getElementText(metadataElement, 'title') || 'No title',
         creator: this.#getElementText(metadataElement, 'creator') || 'Unknown',
         language: this.#getElementText(metadataElement, 'language') || 'Unknown',
         publisher: this.#getElementText(metadataElement, 'publisher') || 'Unknown',
         identifier: this.#getElementText(metadataElement, 'identifier') || undefined,
         description: this.#getElementText(metadataElement, 'description') || undefined,
         subject: Array.from(
            metadataElement.getElementsByTagNameNS('*', 'subject'),
            (element) => element.textContent?.trim() ?? '',
         ).filter(Boolean) || undefined,
      };

      return this.metadata;
   }

   getCover(): Blob | undefined {
      if (this.cover) return this.cover;

      const manifest = this.getManifest();

      // * EPUB 3
      let coverItem = [...manifest.values()].find((item) => item.properties.includes('cover-image'));

      // * EPUB 2 fallback
      if (!coverItem) {
         const opfDocument = this.#getXmlDocument(this.getOpfPath());
         const coverId = [...opfDocument.getElementsByTagName('meta')]
            .find((meta) => meta.getAttribute('name') === 'cover')
            ?.getAttribute('content');

         if (coverId) coverItem = manifest.get(coverId);
      }

      if (!coverItem) return undefined;

      if (!this.epubData) throw new Error('EPUB data is not loaded');
      const coverData = this.epubData[coverItem.resolvedPath];
      if (!coverData) return undefined;

      this.cover = new Blob([coverData as BlobPart], { type: coverItem.mediaType });
      return this.cover;
   }

   getNavigation(): NavigationItem[] {
      if (this.navigation) return this.navigation;

      const opfDocument = this.#getXmlDocument(this.getOpfPath());
      const manifest = this.getManifest();

      const version = this.getVersion();
      // * EPUB 3
      if (version === 3) {
         let navItem = [...this.getManifest().values()].find((item) => item.properties.includes('nav'));
         if (!navItem) {
            // ? Last resort
            const tocItem = [...manifest.values()].find((item) =>
               item.href.includes('toc')
               && (item.href.endsWith('.xhtml') || item.href.endsWith('.html'))
            );
            if (!tocItem) return [];

            navItem = tocItem;
         }
         const navDocument = this.#getXmlDocument(navItem.resolvedPath);
         this.navigation = this.#parseEpub3Navigation(navDocument, navItem.resolvedPath);

         return this.navigation;
      }
      // * EPUB 2
      if (version === 2) {
         const spineItemElement = opfDocument.getElementsByTagName('spine')[0];
         const tocId = spineItemElement?.getAttribute('toc');
         let tocItem: ManifestItem | undefined;
         if (!tocId) {
            // ? last resort
            tocItem = [...manifest.values()].find((item) => item.mediaType === 'application/x-dtbncx+xml')
               ?? [...manifest.values()].find((item) => item.href.endsWith('.ncx'));
         }
         else { tocItem = manifest.get(tocId); }

         if (!tocItem) return [];

         const navDocument = this.#getXmlDocument(tocItem.resolvedPath);
         this.navigation = this.#parseEpub2Navigation(navDocument, tocItem.resolvedPath);

         return this.navigation;
      }

      throw new Error(`Unsupported EPUB version: ${version}`);
   }

   #getXmlDocument(path: Path): Document {
      const normalizedPath = this.#normalizePath(path);
      const data = this.epubData?.[normalizedPath];

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
            if (parts.length === 0) throw new Error(`EPUB resource path escapes package root: ${path}`);
            parts.pop();
            continue;
         }
         parts.push(part);
      }
      return parts.join('/');
   }

   #parseEpub3Navigation(navDocument: Document, navPath: ResourcePath): NavigationItem[] {
      const navElements = navDocument.getElementsByTagName('nav');
      let tocNav: Element | null = null;

      for (const nav of navElements) {
         const epubType = nav.getAttributeNS('http://www.idpf.org/2007/ops', 'type');
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
            const resolvedPath = this.#resolvePath(navPath, hrefPath!);

            const item: NavigationItem = {
               label,
               href,
               resolvedPath,
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

   #parseEpub2Navigation(tocDocument: Document, tocPath: ResourcePath): NavigationItem[] {
      const navMap = tocDocument.getElementsByTagName('navMap')[0];
      if (!navMap) return [];

      const parseNavPoints = (parent: Element): NavigationItem[] => {
         const items: NavigationItem[] = [];
         for (const navPoint of parent.children) {
            if (navPoint.localName !== 'navPoint') continue;

            const label = navPoint.getElementsByTagName('navLabel')[0]
               ?.getElementsByTagName('text')[0]
               ?.textContent?.trim() ?? '';

            const contentSrc = navPoint.getElementsByTagName('content')[0]?.getAttribute('src')
               ?? '';

            const [hrefPath, fragment] = contentSrc.split('#');
            const resolvedPath = this.#resolvePath(tocPath, hrefPath!);

            const item: NavigationItem = {
               label,
               href: contentSrc,
               resolvedPath,
               fragment: fragment,
               children: [],
            };

            if ([...navPoint.children].some((el) => el.localName === 'navPoint'))
               item.children = parseNavPoints(navPoint);

            items.push(item);
         }
         return items;
      };

      return parseNavPoints(navMap);
   }
}
