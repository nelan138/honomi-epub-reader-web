import type { BookRecord } from "../database/book-repository.ts";
import { unzipSync, strFromU8 } from "fflate";

export interface ManifestItem {
   href: string; // * resource path
   path: string;
   mediaType: string;
   properties: string[];
}

export interface SpineItem {
   idref: string; // * id in ManifestItem
   linear: boolean; // * If false = not part of the primary reading order (footnotes, appendices, etc.)
}

export interface NavigationItem {
   label: string;
   href: string;
   path: string;
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
   #epubData?: Record<string, Uint8Array>;
   #opfPath!: string;

   // Parsed EPUB data
   #manifest!: Map<string, ManifestItem>;
   #spine!: SpineItem[];
   #navigation!: NavigationItem[];

   #metadata!: Metadata;
   #cover?: Blob;

   progress = 0;

   constructor() { }

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
      if (typeof bookRecord !== "object" || bookRecord === null)
         throw new TypeError("bookRecord must be an object");

      const book = new EpubBook();

      book.#id = bookRecord.id;
      book.#categoryId = bookRecord.categoryId;
      book.#epubFile = bookRecord.epubFile;
      book.#opfPath = bookRecord.opfPath;
      book.#manifest = bookRecord.manifest;
      book.#spine = bookRecord.spine;
      book.#navigation = bookRecord.navigation;
      book.#metadata = bookRecord.metadata ?? {
         title: "",
         creator: "",
         language: "",
         identifier: "",
         publisher: "",
         description: "",
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

   /**
    * Sets the reading progress of the book.
    */
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

   getOpfPath(): string {
      if (this.#opfPath) return this.#opfPath;

      const containerDocument = this.#getXmlDocument("META-INF/container.xml");
      const rootfile = containerDocument.getElementsByTagName("rootfile")[0];
      const opfPath = rootfile?.getAttribute("full-path");

      if (!opfPath) throw new Error("EPUB container does not define an OPF package path");

      this.#opfPath = this.#normalizePath(opfPath);

      return this.#opfPath;
   }

   getManifest(): Map<string, ManifestItem> {
      if (this.#manifest) return this.#manifest;

      const opfDocument = this.#getXmlDocument(this.#opfPath);

      const manifestElement = opfDocument.querySelector("manifest");
      if (!manifestElement) throw new Error("EPUB package does not contain a manifest");

      this.#manifest = new Map();
      for (const item of manifestElement.querySelectorAll(":scope > item")) {
         const id = item.getAttribute("id");
         if (!id) continue;

         const href = item.getAttribute("href") ?? "";

         const properties = item.getAttribute("properties")?.trim().split(/\s+/) ?? [];
         const manifestItem: ManifestItem = {
            href,
            path: this.#resolvePath(this.#opfPath, href),
            mediaType: item.getAttribute("media-type") ?? "",
            properties,
         }
         this.#manifest.set(id, manifestItem);
      }
      return this.#manifest;
   }

   getSpine(): SpineItem[] {
      if (this.#spine) return this.#spine;

      const opfDocument = this.#getXmlDocument(this.getOpfPath());
      const spineElement = opfDocument.querySelector("spine");

      if (!spineElement) throw new Error("EPUB package does not contain a spine");

      const spineItemElements = spineElement.querySelectorAll("itemref");
      this.#spine = Array.from(spineItemElements, (itemref): SpineItem => {
         const idref = itemref.getAttribute("idref");
         if (!idref) throw new Error("EPUB spine item does not define an idref");

         const spineItem: SpineItem = {
            idref,
            linear: itemref.getAttribute("linear") !== "no",
         };
         return spineItem;
      });
      return this.#spine;
   }

   getNavigation(): NavigationItem[] {
      if (this.#navigation) return this.#navigation;

      const manifest = this.getManifest();
      const navigationManifestItem = [...manifest.values()].find(item => item.properties.includes("nav"));

      if (navigationManifestItem) {
         const navigationDocument = this.#getXmlDocument(navigationManifestItem.path);
         const toc = navigationDocument.querySelector('nav[epub\\:type="toc"], nav[type="toc"]');
         if (toc) {
            const basePath = navigationManifestItem.path;

            const parseList = (list: Element): NavigationItem[] => {
               return [...list.children]
                  .filter(element => element.localName === "li")
                  .map(li => {
                     const link = li.querySelector(":scope > a, :scope > span");
                     const href = link?.getAttribute("href") ?? "";
                     const nestedList = [...li.children].find(
                        element => element.localName === "ol" || element.localName === "ul"
                     );

                     return {
                        label: link?.textContent?.trim() ?? li.textContent?.trim() ?? "",
                        href,
                        path: href ? this.#resolvePath(basePath, href) : "",
                        ...(nestedList ? { children: parseList(nestedList) } : {}),
                     };
                  });
            };
            const list = toc.querySelector(":scope > ol");
            if (list) {
               this.#navigation = parseList(list);
               return this.#navigation;
            }
         }
      }
      const opfDocument = this.#getXmlDocument(this.#opfPath);
      const spine = opfDocument.querySelector("spine");
      const ncxId = spine?.getAttribute("toc");

      const ncxManifestItem = ncxId
         ? manifest.get(ncxId)
         : [...manifest.values()].find(item => item.mediaType === "application/x-dtbncx+xml");

      if (!ncxManifestItem) throw new Error("EPUB package does not contain a navigation document or NCX file");

      const ncxDocument = this.#getXmlDocument(ncxManifestItem.path);
      const navMap = ncxDocument.querySelector("navMap");

      if (!navMap) throw new Error("EPUB NCX document does not contain a navMap");

      const basePath = ncxManifestItem.path;
      const parseNavPoints = (parent: Element): NavigationItem[] => {
         return [...parent.children]
            .filter(element => element.localName === "navPoint")
            .map(navPoint => {
               const label = navPoint.querySelector(":scope > navLabel > text")?.textContent?.trim() ?? "";
               const href = navPoint.querySelector(":scope > content")?.getAttribute("src") ?? "";
               const children = parseNavPoints(navPoint);

               return {
                  label,
                  href,
                  path: href ? this.#resolvePath(basePath, href) : "",
                  ...(children.length ? { children } : {}),
               };
            });
      };

      this.#navigation = parseNavPoints(navMap);
      return this.#navigation;
   }

   getMetadata(): Metadata {
      if (this.#metadata) return this.#metadata;

      const opfDocument = this.#getXmlDocument(this.getOpfPath());
      const metadataElement = opfDocument.getElementsByTagName("metadata")[0];

      if (!metadataElement) throw new Error("EPUB package does not contain metadata");

      this.#metadata = {
         title: this.#getElementText(metadataElement, "title"),
         creator: this.#getElementText(metadataElement, "creator"),
         language: this.#getElementText(metadataElement, "language"),
         identifier: this.#getElementText(metadataElement, "identifier"),
         publisher: this.#getElementText(metadataElement, "publisher"),
         description: this.#getElementText(metadataElement, "description"),
         subject: Array.from(
            metadataElement.getElementsByTagNameNS("*", "subject"),
            (element) => element.textContent?.trim() ?? ""
         ).filter(Boolean),
      };

      return this.#metadata;
   }

   /**
    * Gets the cover image declared by the EPUB.
    *
    * Supports the EPUB 3 `cover-image` property and the EPUB 2
    * `meta name="cover"` convention.
    */
   getCover(): Blob | null {
      if (this.#cover) return this.#cover;

      const manifest = this.getManifest();
      const opfDocument = this.#getXmlDocument(this.#opfPath);

      let coverItem = [...manifest.values()]
         .find(item => item.properties.includes("cover-image"));

      if (!coverItem) {
         const coverId = [...opfDocument.querySelectorAll("meta")]
            .find(element => element.getAttribute("name") === "cover")
            ?.getAttribute("content");

         if (coverId) coverItem = manifest.get(coverId);
      }

      if (!coverItem) {
         this.#cover = undefined;
         return null;
      }

      if (!this.#epubData) throw new Error("EPUB data is not loaded");

      const coverData = this.#epubData[coverItem.path];
      if (!coverData) {
         this.#cover = undefined;
         return null;
      }

      this.#cover = new Blob([coverData.buffer as ArrayBuffer], {
         type: coverItem.mediaType || "application/octet-stream",
      });

      return this.#cover;
   }

   #getXmlDocument(path: string): Document {
      const normalizedPath = this.#normalizePath(path);
      const data = this.#epubData?.[normalizedPath];

      if (!data) throw new Error(`EPUB entry not found: ${normalizedPath}`);

      const xml = strFromU8(data, false);
      const document = new DOMParser().parseFromString(
         xml,
         "application/xml"
      );

      if (document.getElementsByTagName("parsererror").length > 0)
         throw new Error(`Invalid XML in EPUB entry: ${normalizedPath}`);

      return document;
   }

   #getElementText(parent: Element, localName: string): string {
      return (parent
         .getElementsByTagNameNS("*", localName)[0]
         ?.textContent
         ?.trim() ?? ""
      );
   }

   #resolvePath(basePath: string, relativePath: string): string {
      const [path, fragment = ""] = relativePath.split("#");
      const baseParts = this.#normalizePath(basePath).split("/");

      baseParts.pop();

      const resolvedPath = this.#normalizePath(
         [...baseParts, path].join("/")
      );

      return fragment ? `${resolvedPath}#${fragment}` : resolvedPath;
   }

   #normalizePath(path: string): string {
      const parts: string[] = [];

      for (const part of path.replaceAll("\\", "/").split("/")) {
         if (!part || part === ".") continue;

         if (part === "..") {
            parts.pop();
            continue;
         }

         parts.push(part);
      }

      return parts.join("/");
   }
}
