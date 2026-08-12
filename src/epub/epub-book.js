import { unzipSync, strFromU8 } from "../vendor/fflate.js";

/**
 * Represents an EPUB book.
 * @property {string} bookId
 * @property {string} categoryId
 * @property {File | Blob} epubFile - The original EPUB file (imported from <input>) or Blob (pulled from DB).
 * @property {string} opfPath - The path to the EPUB package document (OPF).
 * @property {Array<{id: string, href: string, path: string, mediaType: string, properties: string}>} manifest.
 * @property {Array<{idref: string | null, linear: boolean}>} spine
 * @property {Array<{label: string, href: string, path: string, children: Array}>} navigation
 * @property {Object[{title: string, creator: string, language: string, identifier: string, publisher: string, description: string, subject: string[]}]} metadata
 * @property {Blob} cover - The cover image declared by the EPUB.
 */
export default class EpubBook {
   // * Identity
   #id = null;
   #categoryId = null;

   // * Original data
   #epubFile = null;
   #epubData = null;
   #opfPath = null;

   // * Structure
   #manifest = null;
   #spine = null;
   #navigation = null;

   // * Bookshelf page
   #metadata = null;
   #cover = null;
   progress = null;
   constructor() { };

   /**
    * Creates an EpubBook from an EPUB file (imported from <input>).
    * The EPUB is unzipped and its main structures are parsed and cached.
    *
    * @param {File} file EPUB file.
    * @returns {Promise<EpubBook>}
    */
   static async fromFile(file) {
      if (!(file instanceof File)) throw new TypeError("file must be a File");

      const book = new EpubBook();

      book.#id = null;
      book.#categoryId = null;

      book.#epubFile = file;

      const buffer = await file.arrayBuffer();
      book.#epubData = unzipSync(new Uint8Array(buffer));

      book.#opfPath = book.getOpfPath();
      book.#manifest = book.getManifest();
      book.#spine = book.getSpine();

      book.#navigation = book.getNavigation();
      book.#metadata = book.getMetadata();
      book.#cover = book.getCover();

      return book;
   }

   static fromRecord(bookRecord) {
      if (typeof bookRecord !== "object" || bookRecord === null) throw new TypeError("bookRecord must be an object");
      const book = new EpubBook();

      book.#metadata = {
         title: bookRecord.title ?? "",
         creator: bookRecord.creator ?? "",
         language: bookRecord.language ?? "",
         identifier: bookRecord.identifier ?? "",
         publisher: bookRecord.publisher ?? "",
         description: bookRecord.description ?? "",
         subject: bookRecord.subject ?? []
      };

      book.#id = bookRecord.id ?? null;
      book.#categoryId = bookRecord.categoryId ?? null;
      book.#epubFile = bookRecord.epubFile ?? null;
      book.#epubData = bookRecord.epubData ?? null;
      book.#opfPath = bookRecord.opfPath ?? null;
      book.#manifest = bookRecord.manifest ?? [];
      book.#spine = bookRecord.spine ?? [];
      book.#navigation = bookRecord.navigation ?? [];
      book.#cover = bookRecord.cover ?? null;
      book.progress = bookRecord.progress ?? 0;

      return book;
   }

   setId(id) {
      this.#id = id;
   }

   setCategoryId(id) {
      this.#categoryId = id;
   }

   getId() {
      return this.#id;
   }

   getCategoryId() {
      return this.#categoryId;
   }

   /**
    * Sets the reading progress of the book.
    * @param {Number} progress 
    */
   setProgress(progress) {
      if (!progress || progress < 0) progress = 0;
      if (progress > 100) progress = 100;
      this.progress = progress;
   }

   /**
    * 
    * @returns {Number} 0 to 100
    */
   getProgress() {
      return this.progress;
   }

   getEpubFile() {
      return this.#epubFile;
   }

   /**
    * Gets the path to the EPUB package document (OPF).
    *
    * The path is read from META-INF/container.xml.
    *
    * @returns {string}
    */
   getOpfPath() {
      if (this.#opfPath) return this.#opfPath;

      const containerDocument = this.#getXmlDocument("META-INF/container.xml");
      const rootfile = containerDocument.getElementsByTagName("rootfile")[0];
      const opfPath = rootfile?.getAttribute("full-path");

      if (!opfPath) throw new Error("EPUB container does not define an OPF package path");
      this.#opfPath = this.#normalizePath(opfPath);

      return this.#opfPath;
   }

   /**
    * Gets the EPUB manifest, which is an array of items.
    *
    * @returns {Array<{
    *    id: string,
    *    href: string,
    *    path: string,
    *    mediaType: string,
    *    properties: string
    * }>}
    */
   getManifest() {
      if (this.#manifest) return this.#manifest;

      const opfDocument = this.#getXmlDocument(this.getOpfPath());
      const manifestElement = opfDocument.getElementsByTagName("manifest")[0];

      if (!manifestElement) throw new Error("EPUB package does not contain a manifest");
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
            properties: item.getAttribute("properties") ?? ""
         });
      }

      return this.#manifest;
   }

   /**
    * Finds a manifest item by its ID.
    *
    * @param {string} id
    * @returns {{
    *   id: string,
    *   href: string,
    *   path: string,
    *   mediaType: string,
    *   properties: string
    * } | undefined}
    */
   getManifestItem(id) {
      return this.getManifest().find((item) => item.id === id);
   }

   /**
    * Gets the EPUB spine in reading order.
    *
    * Each entry references an item that can be found by
    * searching the manifest for a matching id.
    *
    * @returns {Array<{
    *   idref: string | null,
    *   linear: boolean
    * }>}
    */
   getSpine() {
      if (this.#spine) return this.#spine;

      const opfDocument = this.#getXmlDocument(this.getOpfPath());
      const spineElement = opfDocument.getElementsByTagName("spine")[0];

      if (!spineElement) throw new Error("EPUB package does not contain a spine");

      this.#spine = Array.from(
         spineElement.getElementsByTagName("itemref"),
         (itemref) => {
            const idref = itemref.getAttribute("idref");

            return {
               idref,
               linear: itemref.getAttribute("linear") !== "no"
            };
         }
      );

      return this.#spine;
   }

   /**
    * Gets the EPUB navigation / table of contents.
    *
    * @returns {Array<{
    *   label: string,
    *   href: string,
    *   path: string,
    *   children: Array<{
    *     label: string,
    *     href: string,
    *     path: string,
    *     children: Array
    *   }>
    * }>}
    */
   getNavigation() {
      if (this.#navigation) return this.#navigation;

      const manifest = this.getManifest();

      const navigationItem =
         manifest.find((item) => item.properties.split(/\s+/).includes("nav"))
         ?? manifest.find((item) => item.mediaType === "application/x-dtbncx+xml");

      if (!navigationItem) {
         this.#navigation = [];
         return this.#navigation;
      }

      const navigationDocument = this.#getXmlDocument(navigationItem.path);

      const navElements = Array.from(navigationDocument.getElementsByTagName("nav"));

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
         (navPoint) => {
            const label = navPoint
               .getElementsByTagName("text")[0]
               ?.textContent
               ?.trim() ?? "";

            const href = navPoint
               .getElementsByTagName("content")[0]
               ?.getAttribute("src") ?? "";

            return {
               label,
               href,
               path: this.#resolvePath(navigationItem.path, href),
               children: []
            };
         }
      );

      return this.#navigation;
   }

   /**
    * Gets common metadata from the EPUB package.
    *
    * @returns {{
    *    title: string,
    *    creator: string,
    *    language: string,
    *    identifier: string,
    *    publisher: string,
    *    description: string,
    *    subject: string[]
    * }}
    */
   getMetadata() {
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
         ).filter(Boolean)
      };

      return this.#metadata;
   }

   /**
    * Gets the cover image declared by the EPUB.
    *
    * Supports the EPUB 3 `cover-image` property and the EPUB 2
    * `meta name="cover"` convention.
    *
    * @returns {Blob | null}
    */
   getCover() {
      if (this.#cover) return this.#cover;

      const manifest = this.getManifest();
      const opfDocument = this.#getXmlDocument(this.getOpfPath());

      let coverItem = manifest.find((item) => item.properties.split(/\s+/).includes("cover-image"));
      if (!coverItem) {
         const metadataElements = Array.from(opfDocument.getElementsByTagName("meta"));

         const coverId = metadataElements.find((element) => element.getAttribute("name") === "cover")?.getAttribute("content");

         if (coverId) coverItem = manifest.find((item) => item.id === coverId);
      }

      if (!coverItem) {
         this.#cover = null;
         return this.#cover;
      }

      const coverData = this.#epubData[coverItem.path];

      if (!coverData) {
         this.#cover = null;
         return this.#cover;
      }

      this.#cover = new Blob([coverData], {
         type: coverItem.mediaType || "application/octet-stream"
      });

      return this.#cover;
   }

   #getXmlDocument(path) {
      const normalizedPath = this.#normalizePath(path);
      const data = this.#epubData?.[normalizedPath];

      if (!data) throw new Error(`EPUB entry not found: ${normalizedPath}`);

      const xml = strFromU8(data);
      const document = new DOMParser().parseFromString(xml, "application/xml");

      if (document.getElementsByTagName("parsererror").length > 0) throw new Error(`Invalid XML in EPUB entry: ${normalizedPath}`);

      return document;
   }

   #getElementText(parent, localName) {
      return (parent.getElementsByTagNameNS("*", localName)[0]?.textContent?.trim() ?? "");
   }

   #readNavigationList(element, navigationPath) {
      const list = Array.from(element.children).find(
         (child) => child.localName === "ol" || child.localName === "ul"
      );

      if (!list) return [];

      return Array.from(list.children)
         .filter((child) => child.localName === "li")
         .map((listItem) => {
            const link = Array.from(listItem.getElementsByTagName("a"))[0];

            const href = link?.getAttribute("href") ?? "";

            return {
               label: link?.textContent?.trim() ?? "",
               href,
               path: this.#resolvePath(navigationPath, href),
               children: this.#readNavigationList(listItem, navigationPath)
            };
         });
   }

   #resolvePath(basePath, relativePath) {
      const [path, fragment = ""] = relativePath.split("#");
      const baseParts = this.#normalizePath(basePath).split("/");

      baseParts.pop();

      const resolvedPath = this.#normalizePath([...baseParts, path].join("/"));

      return fragment ? `${resolvedPath}#${fragment}` : resolvedPath;
   }

   #normalizePath(path) {
      const parts = [];

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
