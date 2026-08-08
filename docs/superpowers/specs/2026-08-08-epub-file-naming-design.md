# EPUB file-naming refactor

## Goal

Use file-neutral EPUB terminology for values that may be either a browser `File` or an IndexedDB-restored `Blob`.

## Design

`EpubBook` will accept and retain an `epubFile` value. Its public accessor will be `getEpubFile()`, and its internal unzip helper will use the same file terminology. Callers will use the renamed accessor.

The value is not converted after IndexedDB retrieval: it remains a `Blob`, which supplies the `arrayBuffer()` interface required by the EPUB parser. JSDoc will explicitly document this distinction.

## Constraints

- Preserve existing EPUB parsing and IndexedDB behavior.
- Do not change the stored book-record shape.
- Remove stale Blob-specific names only where they refer to the EPUB archive rather than the `Blob` web API type.
