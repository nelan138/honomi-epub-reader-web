// @vitest-environment jsdom

import {
   beforeAll,
   describe,
   expect,
   test
} from "vitest";

import EpubBook from "../src/epub/epub-book.js";

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

let book;
let manifest;
let spine;
let navigation;
let metadata;

beforeAll(async () => {
   const fixturePath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "fixture",
      "sample.epub"
   );

   const buffer = await readFile(fixturePath);

   const file = new File(
      [buffer],
      "test.epub",
      {
         type: "application/epub+zip"
      }
   );

   book = await EpubBook.from(file);

   manifest = book.getManifest();
   spine = book.getSpine();
   navigation = book.getNavigation();
   metadata = book.getMetadata();
});

describe("EpubBook package", () => {
   test("parses the OPF path", () => {
      expect(book.getOpfPath()).toBe("item/standard.opf");
   });
});

describe("EpubBook metadata", () => {
   test("parses the title", () => {
      expect(metadata.title).toBe(
         "精霊幻想記20.彼女の聖戦"
      );
   });

   test("parses the creator", () => {
      expect(metadata.creator).toBe("北山結莉");
   });

   test("parses the language", () => {
      expect(metadata.language).toBe("ja");
   });

   test("parses the identifier", () => {
      expect(metadata.identifier).toBe(
         "urn:uuid:C93B4F84-1270-4196-B1FE-134588E9BD45"
      );
   });

   test("parses the publisher", () => {
      expect(metadata.publisher).toBe("ホビージャパン");
   });

   test("parses the description as an empty string when missing", () => {
      expect(metadata.description).toBe("");
   });

   test("parses subjects as an array", () => {
      expect(metadata.subject).toEqual([]);
   });
});

describe("EpubBook manifest", () => {
   test("manifest is a Map", () => {
      expect(manifest).toBeInstanceOf(Map);
      expect(manifest.size).toBeGreaterThan(0);
   });

   test("contains the navigation document", () => {
      const toc = manifest.get("toc");

      expect(toc).toBeDefined();
      expect(toc.id).toBe("toc");
      expect(toc.href).toBe("navigation-documents.xhtml");
      expect(toc.path).toBe(
         "item/navigation-documents.xhtml"
      );
      expect(toc.mediaType).toBe("application/xhtml+xml");
      expect(toc.properties).toBe("nav");
   });

   test("contains the cover image", () => {
      const cover = manifest.get("cover");

      expect(cover).toBeDefined();
      expect(cover.id).toBe("cover");
      expect(cover.href).toBe("image/cover.jpg");
      expect(cover.path).toBe("item/image/cover.jpg");
      expect(cover.mediaType).toBe("image/jpeg");
      expect(cover.properties).toBe("cover-image");
   });

   test("contains the main stylesheet", () => {
      const bookStyle = manifest.get("book-style");

      expect(bookStyle).toBeDefined();
      expect(bookStyle.id).toBe("book-style");
      expect(bookStyle.href).toBe("style/book-style.css");
      expect(bookStyle.path).toBe(
         "item/style/book-style.css"
      );
      expect(bookStyle.mediaType).toBe("text/css");
      expect(bookStyle.properties).toBe("");
   });

   test("contains the first XHTML page", () => {
      const firstPage = manifest.get("p-001");

      expect(firstPage).toBeDefined();
      expect(firstPage.id).toBe("p-001");
      expect(firstPage.href).toBe("xhtml/p-001.xhtml");
      expect(firstPage.path).toBe(
         "item/xhtml/p-001.xhtml"
      );
      expect(firstPage.mediaType).toBe(
         "application/xhtml+xml"
      );
      expect(firstPage.properties).toBe("");
   });
});

describe("EpubBook spine", () => {
   test("spine is an array", () => {
      expect(spine).toBeInstanceOf(Array);
      expect(spine.length).toBeGreaterThan(0);
   });

   test("starts with the cover XHTML document", () => {
      expect(spine[0].idref).toBe("p-cover");
      expect(spine[0].linear).toBe(true);
   });

   test("contains the first content page", () => {
      const firstPage = spine.find(
         (spineItem) => spineItem.idref === "p-001"
      );

      expect(firstPage).toBeDefined();
      expect(firstPage.linear).toBe(true);
      expect(firstPage.item).toBe(
         manifest.get("p-001")
      );
   });

   test("keeps content pages in reading order", () => {
      const firstPageIndex = spine.findIndex(
         (spineItem) => spineItem.idref === "p-001"
      );

      const secondPageIndex = spine.findIndex(
         (spineItem) => spineItem.idref === "p-002"
      );

      expect(firstPageIndex).toBeGreaterThanOrEqual(0);
      expect(secondPageIndex).toBeGreaterThan(firstPageIndex);
   });

   test("links spine items to manifest items", () => {
      for (const spineItem of spine) {
         expect(spineItem.idref).toBeTruthy();
         expect(spineItem.item).toBe(
            manifest.get(spineItem.idref)
         );
      }
   });
});

describe("EpubBook navigation", () => {
   test("navigation is an array", () => {
      expect(navigation).toBeInstanceOf(Array);
      expect(navigation.length).toBeGreaterThan(0);
   });

   test("navigation entries have the expected structure", () => {
      const firstEntry = navigation[0];

      expect(firstEntry).toHaveProperty("label");
      expect(firstEntry).toHaveProperty("href");
      expect(firstEntry).toHaveProperty("path");
      expect(firstEntry).toHaveProperty("children");

      expect(typeof firstEntry.label).toBe("string");
      expect(typeof firstEntry.href).toBe("string");
      expect(typeof firstEntry.path).toBe("string");
      expect(firstEntry.children).toBeInstanceOf(Array);
   });

   test("navigation paths are resolved relative to the navigation document", () => {
      const entries = [];

      function collectEntries(items) {
         for (const item of items) {
            entries.push(item);
            collectEntries(item.children);
         }
      }

      collectEntries(navigation);

      for (const entry of entries) {
         expect(entry.path).toContain("item/");
      }
   });
});

describe("EpubBook cover", () => {
   test("extracts the cover as a Blob", () => {
      const cover = book.getCover();

      expect(cover).toBeInstanceOf(Blob);
      expect(cover.type).toBe("image/jpeg");
      expect(cover.size).toBeGreaterThan(0);
   });
});