/*
Technology Stack & Restrictions:
- ZIP Extraction: Use fflate
- XML Parsing: Use the native browser DOMParser. Do not install external XML parsers (e.g., xmldom, fast-xml-parser).
- DOM Traversal: Do not use querySelector or querySelectorAll for parsing OPF, container, or nav XML documents —
  these documents rely on namespaces (OPF default ns, embedded Dublin Core, XHTML nav), and unprefixed CSS
  selectors silently return empty results against namespaced/XHTML-as-XML content in some parser configurations.
  Query all OPF structural elements (package, manifest, item, spine, itemref) using getElementsByTagNameNS with the OPF namespace, or fallback to matching element.localName to support prefixed schemas like <opf:item>.

Namespace URIs:
- OPS (epub): http://www.idpf.org/2007/ops
- OPF:        http://www.idpf.org/2007/opf
- Dublin Core: http://purl.org/dc/elements/1.1/
- Container:  urn:oasis:names:tc:opendocument:xmlns:container
- NCX:        http://www.daisy.org/z3986/2005/ncx/
- XHTML (nav): http://www.w3.org/1999/xhtml

Resource Limits (calibrated for browser stability):
- Max compressed archive size: 100 MB (reject before reading into memory).
- Max total declared decompressed size: 200 MB (prevents mobile tab OOM crashes).
- Max individual entry size: 30 MB.
- Max entry count: 2,000 files (typical EPUBs have 20–500; ignore directory entries ending in '/').

Path Resolution:
- Resolve all manifest and navigation hrefs against their parent document's directory
  (percent-decoded, fragments separated) so every stored `href` matches its root-relative key in `archive`.
- Normalize separators to '/' and prevent directory traversal outside the archive root.

Error Handling (explicit, not best-effort unless stated):
- Missing or unparsable container.xml → throw.
- Missing or unparsable OPF (rootfile target) → throw.
- Missing required metadata (title, language, identifier) → throw; do not substitute empty strings.
- Manifest item referencing a href not present in the archive → throw (do not silently drop the item).
- Any other malformed-but-non-critical data (e.g. a spine itemref with no matching manifest id) → skip that
  entry and continue, do not throw.

Metadata extraction rules:
- creator: concatenate all dc:creator values in document order, comma-separated.

Cover extraction (try in this order, use first match, else leave `cover` undefined):
1. EPUB3: manifest item with properties containing "cover-image".
2. EPUB2: <meta name="cover" content="{manifest-id}"> in OPF metadata → resolve to that manifest item's href.
- If a cover is found, load its bytes from `archive` and wrap as a Blob using its manifest mediaType.

Spine extraction:
- Iterate <spine> <itemref>. Map `itemref.getAttribute('idref')` to `SpineItem.id` (skip if idref is not in manifest).
- linear: false if itemref attribute `linear` is explicitly "no" (case-insensitive); otherwise true.

Navigation extraction (support both, prefer EPUB 3):
1. EPUB 3: Manifest item with `properties` token "nav". Locate <nav> element where `epub:type` tokens
   include "toc" or `role="doc-toc"`. Traverse <ol>/<li> in document order:
   - If <a> present: label = a.textContent.trim(), href = path portion resolved against nav document's
     directory (to match archive keys), fragment = URI fragment without '#' (if present).
   - If only <span> present: label = span.textContent.trim(), href = undefined.
2. Fallback EPUB 2: NCX (referenced via spine `toc` attribute or manifest media-type application/x-dtbncx+xml).
   Traverse <navPoint> in document order:
   - label = navPoint > navLabel > text textContent.trim().
   - href = path portion of <content src="..."> resolved against NCX document's directory, fragment = URI fragment without '#'.
- If neither is present, leave `navigation` undefined.
*/


// Book structure:
type Metadata = {
   title: string;
   language: string;
   identifier: string;
   modified?: string;
   creator?: string; // see "Metadata extraction rules" above
   publisher?: string;
};

type SpineItem = {
   linear: boolean;
   id: string;
   properties?: string[];
};

type ManifestItem = {
   href: string; // normalized path — see "Path Resolution"
   mediaType: string;
   properties?: string[];
};

type NavigationItem = {
   label: string;
   href: string;
   fragment?: string;
   // no need for nested items
};

type Epub = {
   metadata: Metadata;
   cover?: Blob;

   // key: normalized file path (see Path Resolution), value: file content
   archive: Record<string, Uint8Array>;

   // key: SpineItem.id
   manifest: Map<string, ManifestItem>;
   spine: SpineItem[];
   navigation?: NavigationItem[];
};

// Goal: a single async function makeBook() takes File (blob) as input and returns Book.
// Throws on: oversized/malformed archive, missing container.xml/OPF, missing required metadata,
// or path traversal (see rules above). Does not throw on missing cover/navigation/optional metadata.
async function makeBook(file: File): Promise<Epub>;
