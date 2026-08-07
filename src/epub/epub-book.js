import { unzipSync, strFromU8 } from "../vendor/fflate.js";

export class EpubBook {
   #files = null;

   constructor() {
      this.metadata = null;
      this.cover = null;
   }

   /**
    * Creates an EpubBook from a File.
    *
    * @param {File} file - The EPUB file selected by the user.
    * @returns {Promise<EpubBook>} The parsed EPUB book.
    */
   static async fromFile(file) {
      const files = await EpubBook.#unzipFile(file);
      const packagePath = EpubBook.#getPackagePath(files);
      const packageDoc = EpubBook.#getPackageDocument(files, packagePath);

      const book = new EpubBook();

      book.#files = files;
      book.metadata = EpubBook.#parseMetadata(packageDoc);
      book.cover = EpubBook.#parseCover(files, packageDoc, packagePath);

      return book;
   }

   /**
    * @returns {Object}
    */
   getMetadata() {
      return this.metadata;
   }

   /**
    * Returns the cover image as a Blob.
    *
    * @returns {Blob|null}
    */
   getCover() {
      return this.cover;
   }

   static async #unzipFile(file) {
      try {
         const rawBytes = new Uint8Array(await file.arrayBuffer());
         return unzipSync(rawBytes);
      } catch {
         throw new Error("File does not appear to be a valid EPUB.");
      }
   }

   static #getPackagePath(files) {
      const containerBytes = files["META-INF/container.xml"];

      if (!containerBytes) {
         throw new Error("Invalid EPUB: META-INF/container.xml not found.");
      }

      const containerDoc = EpubBook.#parseXml(containerBytes);

      const packagePath = containerDoc
         .querySelector("rootfile")
         ?.getAttribute("full-path");

      if (!packagePath) {
         throw new Error("Invalid EPUB: package file not found.");
      }

      return packagePath;
   }

   static #getPackageDocument(files, packagePath) {
      const packageBytes = files[packagePath];

      if (!packageBytes) {
         throw new Error(`Invalid EPUB: ${packagePath} not found.`);
      }

      return EpubBook.#parseXml(packageBytes);
   }

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

   static #parseCover(files, packageDoc, packagePath) {
      let coverItem = packageDoc.querySelector(
         'manifest item[properties~="cover-image"]'
      );

      if (!coverItem) {
         const coverId = packageDoc
            .querySelector('metadata meta[name="cover"]')
            ?.getAttribute("content");

         if (coverId) {
            coverItem = [...packageDoc.querySelectorAll("manifest item")]
               .find(item => item.getAttribute("id") === coverId);
         }
      }

      if (!coverItem) {
         return null;
      }

      const href = coverItem.getAttribute("href");

      if (!href) {
         return null;
      }

      const coverPath = EpubBook.#resolvePath(packagePath, href);
      const coverBytes = files[coverPath];

      if (!coverBytes) {
         return null;
      }

      return new Blob([coverBytes], {
         type:
            coverItem.getAttribute("media-type") ??
            "application/octet-stream"
      });
   }

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
    * @param {string} resourcePath
    * @returns {string}
    */
   static #resolvePath(packagePath, resourcePath) {
      const base = packagePath.split("/").slice(0, -1);

      const parts = [
         ...base,
         ...resourcePath.split("/")
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