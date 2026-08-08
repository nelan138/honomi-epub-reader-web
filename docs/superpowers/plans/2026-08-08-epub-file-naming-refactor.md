# EPUB File-Naming Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consistently call the original EPUB archive an EPUB file while accepting either browser `File` values or IndexedDB-restored `Blob` values.

**Architecture:** Rename only archive-facing identifiers in `EpubBook` and its consumers. Keep IndexedDB persistence unchanged, documenting that stored values are `Blob`s which satisfy the `Blob` interface used by the parser.

**Tech Stack:** Native browser ES modules, Blob/File APIs, IndexedDB.

## Global Constraints

- Preserve EPUB parsing and IndexedDB record behavior.
- Do not convert an IndexedDB `Blob` into a `File`.
- Use `epubFile` and `getEpubFile()` for the original archive API.

---

### Task 1: Rename the EPUB archive API and update consumers

**Files:**
- Modify: `src/epub/epub-book.js`
- Modify: `src/pages/bookshelf/features/import-books.js`

**Interfaces:**
- Produces: `new EpubBook(epubFile)` and `epub.getEpubFile()` where `epubFile` is `File|Blob`.

- [ ] **Step 1: Replace archive-specific Blob names**

Rename `#epubBlob`, `epubBlob`, `getEpubBlob`, and `#unzipBlob` to their `epubFile`/`getEpubFile`/`#unzipFile` equivalents. Update JSDoc to say an IndexedDB-restored `Blob` is accepted as the EPUB file payload.

- [ ] **Step 2: Update upload caller**

Replace `epub.getEpubBlob()` with `epub.getEpubFile()` while keeping the stored field name `file` unchanged.

- [ ] **Step 3: Remove invalid private-field initialization**

Keep `metadata` and `cover` as public parsed-result properties and initialize them as `this.metadata = null` and `this.cover = null` in the constructor.

- [ ] **Step 4: Verify the module and stale references**

Run:

```powershell
node -e "import('./src/epub/epub-book.js').then(({default:EpubBook})=>{const epub=new EpubBook(new Blob()); console.log(epub.getEpubFile() instanceof Blob)}).catch(error=>{console.error(error);process.exitCode=1})"
rg -n "getEpubBlob|#epubBlob|epubBlob|#unzipBlob" src
```

Expected: the Node command prints `true`; the search finds no stale archive-specific Blob identifiers.
