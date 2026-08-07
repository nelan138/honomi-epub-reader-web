import { unzipSync, strFromU8 } from "../vendor/fflate.js";

export class EpubBook {
   #files = null;
   #epubBlob = null;

   /**
    * Creates an EpubBook from an EPUB Blob.
    *
    * File objects are also accepted because File extends Blob.
    *
    * The EPUB is not parsed automatically because parsing requires
    * asynchronous operations. Call parse() after construction.
    *
    * @param {Blob} epubBlob - The original EPUB archive.
    */
   constructor(epubBlob) {
      this.#epubBlob = epubBlob;

      this.metadata = null;
      this.cover = null;
   }
   
   /**
    * Parses the EPUB archive.
    *
    * Decompresses the EPUB, locates its package document,
    * and extracts metadata and the cover image.
    *
    * @returns {Promise<EpubBook>} The parsed EpubBook instance.
    */
   async parse() {
      const files = await EpubBook.#unzipBlob(this.#epubBlob);

      const packagePath = EpubBook.#getPackagePath(files);

      const packageDoc = EpubBook.#getPackageDocument(
         files,
         packagePath
      );

      this.#files = files;

      this.metadata = EpubBook.#parseMetadata(packageDoc);

      this.cover = EpubBook.#parseCover(
         files,
         packageDoc,
         packagePath
      );

      return this;
   }

   /**
    * Returns the original EPUB archive.
    *
    * If the EpubBook was constructed from a File, the returned
    * value is still that File because File extends Blob.
    *
    * @returns {Blob} The original EPUB Blob or File.
    */
   getEpubBlob() {
      return this.#epubBlob;
   }

   /**
    * Returns the parsed EPUB metadata.
    *
    * @returns {Object|null}
    */
   getMetadata() {
      return this.metadata;
   }

   /**
    * Returns the extracted cover image.
    *
    * @returns {Blob|null}
    */
   getCover() {
      return this.cover;
   }

   /**
    * Decompresses an EPUB archive.
    *
    * File objects are also accepted because File extends Blob.
    *
    * @param {Blob} epubBlob - The EPUB archive.
    * @returns {Promise<Object<string, Uint8Array>>}
    * The decompressed EPUB files keyed by their paths.
    */
   static async #unzipBlob(epubBlob) {
      try {
         const rawBytes = new Uint8Array(
            await epubBlob.arrayBuffer()
         );

         return unzipSync(rawBytes);
      } catch {
         throw new Error(
            "File does not appear to be a valid EPUB."
         );
      }
   }

   /**
    * Finds the EPUB package document path from container.xml.
    *
    * @param {Object<string, Uint8Array>} files
    * The decompressed EPUB files.
    *
    * @returns {string} The package document path.
    */
   static #getPackagePath(files) {
      const containerBytes = files["META-INF/container.xml"];

      if (!containerBytes) {
         throw new Error(
            "Invalid EPUB: META-INF/container.xml not found."
         );
      }

      const containerDoc = EpubBook.#parseXml(containerBytes);

      const packagePath = containerDoc
         .querySelector("rootfile")
         ?.getAttribute("full-path");

      if (!packagePath) {
         throw new Error(
            "Invalid EPUB: package file not found."
         );
      }

      return packagePath;
   }

   /**
    * Retrieves and parses the EPUB package document.
    *
    * @param {Object<string, Uint8Array>} files
    * The decompressed EPUB files.
    *
    * @param {string} packagePath
    * Path to the package document.
    *
    * @returns {Document} The parsed package document.
    */
   static #getPackageDocument(files, packagePath) {
      const packageBytes = files[packagePath];

      if (!packageBytes) {
         throw new Error(
            `Invalid EPUB: ${packagePath} not found.`
         );
      }

      return EpubBook.#parseXml(packageBytes);
   }

   /**
    * Extracts metadata from the EPUB package document.
    *
    * @param {Document} packageDoc
    * The parsed EPUB package document.
    *
    * @returns {{
    *   title: string,
    *   author: string,
    *   language: string,
    *   identifier: string
    * }}
    */
   static #parseMetadata(packageDoc) {
      const DC = "http://purl.org/dc/elements/1.1/";

      const getText = (localName) =>
         packageDoc
            .getElementsByTagNameNS(DC, localName)[0]
            ?.textContent
            ?.trim() ?? "";

      return {
         title: getText("title"),
         author: getText("creator"),
         language: getText("language"),
         identifier: getText("identifier"),
      };
   }

   /**
    * Extracts the cover image from the EPUB.
    *
    * Supports the EPUB 3 cover-image property and the older
    * EPUB 2 metadata cover declaration.
    *
    * @param {Object<string, Uint8Array>} files
    * The decompressed EPUB files.
    *
    * @param {Document} packageDoc
    * The parsed EPUB package document.
    *
    * @param {string} packagePath
    * Path to the package document.
    *
    * @returns {Blob|null} The cover image, or null if none exists.
    */
   static #parseCover(files, packageDoc, packagePath) {
      let coverItem = packageDoc.querySelector(
         'manifest item[properties~="cover-image"]'
      );

      if (!coverItem) {
         const coverId = packageDoc
            .querySelector('metadata meta[name="cover"]')
            ?.getAttribute("content");

         if (coverId) {
            coverItem = [
               ...packageDoc.querySelectorAll("manifest item"),
            ].find(
               (item) => item.getAttribute("id") === coverId
            );
         }
      }

      if (!coverItem) {
         return null;
      }

      const href = coverItem.getAttribute("href");

      if (!href) {
         return null;
      }

      const coverPath = EpubBook.#resolvePath(
         packagePath,
         href
      );

      const coverBytes = files[coverPath];

      if (!coverBytes) {
         return null;
      }

      return new Blob([coverBytes], {
         type:
            coverItem.getAttribute("media-type") ??
            "application/octet-stream",
      });
   }

   /**
    * Parses XML bytes into a Document.
    *
    * @param {Uint8Array} bytes - UTF-8 encoded XML bytes.
    * @returns {Document} The parsed XML document.
    */
   static #parseXml(bytes) {
      return new DOMParser().parseFromString(
         strFromU8(bytes),
         "application/xml"
      );
   }

   /**
    * Resolves a resource path relative to the OPF file.
    *
    * @param {string} packagePath
    * Path to the EPUB package document.
    *
    * @param {string} resourcePath
    * Resource path relative to the package document.
    *
    * @returns {string} The resolved EPUB resource path.
    */
   static #resolvePath(packagePath, resourcePath) {
      const base = packagePath
         .split("/")
         .slice(0, -1);

      const parts = [
         ...base,
         ...resourcePath.split("/"),
      ];

      const resolved = [];

      for (const part of parts) {
         if (part === "." || part === "") {
            continue;
         }

         if (part === "..") {
            resolved.pop();
         } else {
            resolved.push(part);
         }
      }

      return resolved.join("/");
   }
}