import { unzipSync, strFromU8 } from "../vendor/fflate.js";

export default class EpubBook {
   // * Identity
   #bookId = null;
   #categoryId = null;

   // * Original data
   #epubFile = null;
   #epubData = null;
   #opfPath = null;

   // * Structure
   #manifest = null;
   #spine = null;
   #navigation = null;

   // Bookshelf page
   #metadata = null;
   #cover = null;

   /**
    * Creates an EpubBook from an EPUB file or Blob.
    *
    * The EPUB is unzipped and its main structures are parsed and cached.
    *
    * @param {File | Blob} file EPUB file.
    * @returns {Promise<EpubBook>}
    */
   static async from(file) {
      if (!(file instanceof Blob) && !(file instanceof File)) throw new TypeError("file must be a File or Blob");
      
      const book = new EpubBook();

      book.#bookId = null;
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

   setBookId(id) {
      this.#bookId = id;
   }

   setCategoryId(id) {
      this.#categoryId = id;
   }

   getBookId() {
      return this.#bookId;
   }

   getCategoryId() {
      return this.#categoryId;
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
    * Gets the EPUB manifest indexed by item ID.
    *
    * Each item contains its original href and its resolved path
    * within the EPUB archive.
    *
    * @returns {Map<string, {
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
      this.#manifest = new Map();

      for (const item of manifestElement.getElementsByTagName("item")) {
         const id = item.getAttribute("id");
         if (!id) continue;

         const href = item.getAttribute("href") ?? "";

         this.#manifest.set(id, {
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
    * Gets the EPUB spine in reading order.
    *
    * Each entry references an item from the manifest through `idref`.
    *
    * @returns {Array<{
    *    idref: string,
    *    linear: boolean,
    *    item: object | null
    * }>}
    */
   getSpine() {
      if (this.#spine) return this.#spine;

      const opfDocument = this.#getXmlDocument(this.getOpfPath());
      const spineElement = opfDocument.getElementsByTagName("spine")[0];

      if (!spineElement) throw new Error("EPUB package does not contain a spine");

      const manifest = this.getManifest();

      this.#spine = Array.from(
         spineElement.getElementsByTagName("itemref"),
         (itemref) => {
            const idref = itemref.getAttribute("idref");

            return {
               idref,
               linear: itemref.getAttribute("linear") !== "no",
               item: idref ? manifest.get(idref) ?? null : null
            };
         }
      );

      return this.#spine;
   }

   /**
    * Gets the EPUB navigation / table of contents.
    *
    * EPUB 3 navigation is preferred, with EPUB 2 NCX used as a fallback.
    *
    * @returns {Array<object>}
    */
   getNavigation() {
      if (this.#navigation) return this.#navigation;

      const manifest = this.getManifest();

      const navigationItem =
         Array.from(manifest.values()).find((item) =>
            item.properties.split(/\s+/).includes("nav")
         ) ??
         Array.from(manifest.values()).find(
            (item) => item.mediaType === "application/x-dtbncx+xml"
         );

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
         (navPoint) => {
            const label = navPoint.getElementsByTagName("text")[0]?.textContent?.trim() ?? "";
            const src = navPoint.getElementsByTagName("content")[0]?.getAttribute("src") ?? "";

            return {
               label,
               href: src,
               path: this.#resolvePath(navigationItem.path, src)
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

      let coverItem = Array.from(manifest.values()).find((item) =>
         item.properties.split(/\s+/).includes("cover-image")
      );

      if (!coverItem) {
         const metadataElements = Array.from(
            opfDocument.getElementsByTagName("meta")
         );

         const coverId = metadataElements.find((element) =>
            element.getAttribute("name") === "cover"
         )?.getAttribute("content");

         if (coverId) coverItem = manifest.get(coverId);
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
               children: this.#readNavigationList(
                  listItem,
                  navigationPath
               )
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
