import type { BookRecord } from "../database/book-repository.js";
import { unzipSync, strFromU8 } from "../vendor/fflate.js";

export interface ManifestItem {
   id: string;
   href: string;
   path: string;
   mediaType: string;
   properties: string;
}

export interface SpineItem {
   idref: string;
   linear: boolean;
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
   // Identity
   #id?: number;
   #categoryId!: number;

   // Original data
   #epubFile!: Blob;
   #epubData?: Record<string, Uint8Array>;
   #opfPath!: string;

   // Structure
   #manifest!: ManifestItem[];
   #spine!: SpineItem[];
   #navigation!: NavigationItem[];

   // Bookshelf page
   #metadata!: Metadata;
   #cover?: Blob;
   progress: number = 0;

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

   /**
    * Creates an EpubBook from a BookRecord.
    */
   static fromRecord(bookRecord: BookRecord): EpubBook {
      if (typeof bookRecord !== "object" || bookRecord === null) {
         throw new TypeError("bookRecord must be an object");
      }

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

   /**
    * Gets the path to the EPUB package document (OPF).
    *
    * The path is read from META-INF/container.xml.
    */
   getOpfPath(): string {
      if (this.#opfPath) return this.#opfPath;

      const containerDocument = this.#getXmlDocument("META-INF/container.xml");
      const rootfile = containerDocument.getElementsByTagName("rootfile")[0];
      const opfPath = rootfile?.getAttribute("full-path");

      if (!opfPath) {
         throw new Error("EPUB container does not define an OPF package path");
      }

      this.#opfPath = this.#normalizePath(opfPath);

      return this.#opfPath;
   }

   /**
    * Gets the EPUB manifest, which is an array of items.
    */
   getManifest(): ManifestItem[] {
      if (this.#manifest) return this.#manifest;

      const opfDocument = this.#getXmlDocument(this.getOpfPath());
      const manifestElement = opfDocument.getElementsByTagName("manifest")[0];

      if (!manifestElement) {
         throw new Error("EPUB package does not contain a manifest");
      }

      this.#manifest = [];

      for (const item of manifestElement.getElementsByTagName("item")) {
         const id = item.getAttribute("id");
         if (!id) continue;

         const href = item.getAttribute("href") ?? "";

         this.#manifest.push({
            id,
            href,
            path: this.#resolvePath(this.getOpfPath(), href),
            mediaType: item.getAttribute("media-type") ?? "",
            properties: item.getAttribute("properties") ?? "",
         });
      }

      return this.#manifest;
   }

   /**
    * Finds a manifest item by its ID.
    */
   getManifestItem(id: string): ManifestItem | undefined {
      return this.getManifest().find((item) => item.id === id);
   }

   /**
    * Gets the EPUB spine in reading order.
    */
   getSpine(): SpineItem[] {
      if (this.#spine) return this.#spine;

      const opfDocument = this.#getXmlDocument(this.getOpfPath());
      const spineElement = opfDocument.getElementsByTagName("spine")[0];

      if (!spineElement) {
         throw new Error("EPUB package does not contain a spine");
      }

      this.#spine = Array.from(
         spineElement.getElementsByTagName("itemref"),
         (itemref): SpineItem => {
            const idref = itemref.getAttribute("idref");

            if (!idref) {
               throw new Error("EPUB spine item does not define an idref");
            }

            return {
               idref,
               linear: itemref.getAttribute("linear") !== "no",
            };
         }
      );

      return this.#spine;
   }

   /**
    * Gets the EPUB navigation / table of contents.
    */
   getNavigation(): NavigationItem[] {
      if (this.#navigation) return this.#navigation;

      const manifest = this.getManifest();

      const navigationItem =
         manifest.find((item) => item.properties.split(/\s+/).includes("nav")) ??
         manifest.find((item) => item.mediaType === "application/x-dtbncx+xml");

      if (!navigationItem) {
         this.#navigation = [];
         return this.#navigation;
      }

      const navigationDocument = this.#getXmlDocument(navigationItem.path);

      const navElements = Array.from(
         navigationDocument.getElementsByTagName("nav")
      );

      const tocElement =
         navElements.find(
            (element) =>
               element.getAttribute("epub:type") === "toc" ||
               element.getAttribute("type") === "toc"
         ) ?? navElements[0];

      if (tocElement) {
         this.#navigation = this.#readNavigationList(
            tocElement,
            navigationItem.path
         );

         return this.#navigation;
      }

      this.#navigation = Array.from(
         navigationDocument.getElementsByTagName("navPoint"),
         (navPoint): NavigationItem => {
            const label =
               navPoint
                  .getElementsByTagName("text")[0]
                  ?.textContent
                  ?.trim() ?? "";

            const href =
               navPoint
                  .getElementsByTagName("content")[0]
                  ?.getAttribute("src") ?? "";

            return {
               label,
               href,
               path: this.#resolvePath(navigationItem.path, href),
               children: [],
            };
         }
      );

      return this.#navigation;
   }

   /**
    * Gets common metadata from the EPUB package.
    */
   getMetadata(): Metadata {
      if (this.#metadata) return this.#metadata;

      const opfDocument = this.#getXmlDocument(this.getOpfPath());
      const metadataElement = opfDocument.getElementsByTagName("metadata")[0];

      if (!metadataElement) {
         throw new Error("EPUB package does not contain metadata");
      }

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
      const opfDocument = this.#getXmlDocument(this.getOpfPath());

      let coverItem = manifest.find((item) =>
         item.properties.split(/\s+/).includes("cover-image")
      );

      if (!coverItem) {
         const metadataElements = Array.from(
            opfDocument.getElementsByTagName("meta")
         );

         const coverId = metadataElements
            .find((element) => element.getAttribute("name") === "cover")
            ?.getAttribute("content");

         if (coverId) {
            coverItem = manifest.find((item) => item.id === coverId);
         }
      }

      if (!coverItem) {
         this.#cover = undefined;
         return null;
      }

      if (!this.#epubData) {
         throw new Error("EPUB data is not loaded");
      }

      const coverData = this.#epubData[coverItem.path];

      if (!coverData) {
         this.#cover = undefined;
         return null;
      }

      const buffer = new ArrayBuffer(coverData.byteLength);
      new Uint8Array(buffer).set(coverData);

      this.#cover = new Blob([buffer], {
         type: coverItem.mediaType || "application/octet-stream",
      });

      return this.#cover;
   }

   #getXmlDocument(path: string): Document {
      const normalizedPath = this.#normalizePath(path);
      const data = this.#epubData?.[normalizedPath];

      if (!data) {
         throw new Error(`EPUB entry not found: ${normalizedPath}`);
      }

      const xml = strFromU8(data, false);
      const document = new DOMParser().parseFromString(
         xml,
         "application/xml"
      );

      if (document.getElementsByTagName("parsererror").length > 0) {
         throw new Error(`Invalid XML in EPUB entry: ${normalizedPath}`);
      }

      return document;
   }

   #getElementText(parent: Element, localName: string): string {
      return (
         parent
            .getElementsByTagNameNS("*", localName)[0]
            ?.textContent
            ?.trim() ?? ""
      );
   }

   #readNavigationList(
      element: Element,
      navigationPath: string
   ): NavigationItem[] {
      const list = Array.from(element.children).find(
         (child) => child.localName === "ol" || child.localName === "ul"
      );

      if (!list) return [];

      return Array.from(list.children)
         .filter((child) => child.localName === "li")
         .map((listItem): NavigationItem => {
            const link = Array.from(
               listItem.getElementsByTagName("a")
            )[0];

            const href = link?.getAttribute("href") ?? "";

            return {
               label: link?.textContent?.trim() ?? "",
               href,
               path: this.#resolvePath(navigationPath, href),
               children: this.#readNavigationList(listItem, navigationPath),
            };
         });
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
