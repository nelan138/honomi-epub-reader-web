import type {
   Epub,
   ManifestItem,
   Metadata,
   NavigationItem,
   SpineItem,
} from './types.ts';

// ─── Namespace URIs ──────────────────────────────────────────
const NS_CONTAINER = 'urn:oasis:names:tc:opendocument:xmlns:container';
const NS_OPF = 'http://www.idpf.org/2007/opf';
const NS_DC = 'http://purl.org/dc/elements/1.1/';
const NS_NCX = 'http://www.daisy.org/z3986/2005/ncx/';
const NS_XHTML = 'http://www.w3.org/1999/xhtml';
const NS_OPS = 'http://www.idpf.org/2007/ops';

const domParser = new DOMParser();

// ─── Helpers ─────────────────────────────────────────────────

function decodeText(data: Uint8Array): string {
   return new TextDecoder('utf-8').decode(data);
}

function toBlob(data: Uint8Array, type: string): Blob {
   return new Blob([data as Uint8Array<ArrayBuffer>], { type });
}

function parseXml(
   xml: string,
   label: string,
): Document {
   const doc = domParser.parseFromString(xml, 'application/xml');
   const err = doc.getElementsByTagName('parsererror');
   if (err.length > 0)
      throw new Error(`Failed to parse ${label}: ${err[0]!.textContent}`);
   return doc;
}

/** Get the directory portion of a path (everything up to and including the last '/'). */
function dirOf(path: string): string {
   const i = path.lastIndexOf('/');
   return i === -1 ? '' : path.slice(0, i + 1);
}

/**
 * Resolve `href` against a `base` directory, percent-decode, strip fragment,
 * normalize to forward-slash, and prevent directory traversal outside the archive root.
 * Returns `{ path, fragment }`.
 */
function resolveHref(
   href: string,
   baseDir: string,
): { path: string; fragment: string | undefined } {
   // Separate fragment
   let fragment: string | undefined;
   const hashIdx = href.indexOf('#');
   if (hashIdx !== -1) {
      fragment = href.slice(hashIdx + 1);
      href = href.slice(0, hashIdx);
   }

   // Percent-decode
   href = decodeURIComponent(href);

   // Join with base directory
   let resolved = baseDir + href;

   // Normalize separators
   resolved = resolved.replace(/\\/g, '/');

   // Collapse . and .. segments
   const parts = resolved.split('/');
   const stack: string[] = [];
   for (const seg of parts) {
      if (seg === '' || seg === '.') continue;
      if (seg === '..') {
         if (stack.length === 0) {
            throw new Error(
               `Path traversal outside archive root: "${href}"`,
            );
         }
         stack.pop();
      }
      else {
         stack.push(seg);
      }
   }

   return { path: stack.join('/'), fragment };
}

/**
 * Collect elements by namespace + localName, supporting both
 * getElementsByTagNameNS and a localName fallback for edge-case parsers.
 */
function elementsByNS(
   parent: Document | Element,
   ns: string,
   localName: string,
): Element[] {
   let list = parent.getElementsByTagNameNS(ns, localName);
   if (list.length > 0) return Array.from(list);

   // Fallback: match localName directly (handles prefixed schemas like <opf:item>)
   list = parent.getElementsByTagNameNS('*', localName);
   return Array.from(list).filter(
      (el) => el.localName === localName,
   );
}

// ─── Container ───────────────────────────────────────────────

function parseContainer(
   archive: Record<string, Uint8Array>,
): string {
   const containerData = archive['META-INF/container.xml'];
   if (!containerData)
      throw new Error('Missing META-INF/container.xml in EPUB archive.');

   const doc = parseXml(decodeText(containerData), 'container.xml');
   const rootfiles = elementsByNS(doc, NS_CONTAINER, 'rootfile');

   if (rootfiles.length === 0) {
      throw new Error(
         'container.xml contains no <rootfile> element.',
      );
   }

   const fullPath = rootfiles[0]!.getAttribute('full-path');
   if (!fullPath) {
      throw new Error(
         'container.xml <rootfile> missing full-path attribute.',
      );
   }

   return fullPath.replace(/\\/g, '/');
}

// ─── Metadata ────────────────────────────────────────────────

function parseMetadata(opfDoc: Document): Metadata {
   const metaEls = elementsByNS(opfDoc, NS_OPF, 'metadata');
   if (metaEls.length === 0)
      throw new Error('OPF is missing <metadata> element.');

   const metaEl = metaEls[0]!;

   // Required fields
   const titleEl = elementsByNS(metaEl, NS_DC, 'title')[0];
   if (!titleEl?.textContent?.trim())
      throw new Error('Missing required metadata: dc:title.');

   const languageEl = elementsByNS(metaEl, NS_DC, 'language')[0];
   if (!languageEl?.textContent?.trim())
      throw new Error('Missing required metadata: dc:language.');

   const identifierEl = elementsByNS(
      metaEl,
      NS_DC,
      'identifier',
   )[0];
   if (!identifierEl?.textContent?.trim())
      throw new Error('Missing required metadata: dc:identifier.');

   const metadata: Metadata = {
      title: titleEl.textContent!.trim(),
      language: languageEl.textContent!.trim(),
      identifier: identifierEl.textContent!.trim(),
   };

   // Optional: creator (concatenate all in document order, comma-separated)
   const creators = elementsByNS(metaEl, NS_DC, 'creator');
   if (creators.length > 0) {
      const joined = creators
         .map((el) => el.textContent?.trim())
         .filter(Boolean)
         .join(', ');
      if (joined) metadata.creator = joined;
   }

   // Optional: publisher
   const publisherEl = elementsByNS(
      metaEl,
      NS_DC,
      'publisher',
   )[0];
   if (publisherEl?.textContent?.trim())
      metadata.publisher = publisherEl.textContent!.trim();

   // Optional: modified
   // EPUB 3: <meta property="dcterms:modified">
   const allMeta = elementsByNS(metaEl, NS_OPF, 'meta');
   for (const m of allMeta) {
      if (m.getAttribute('property') === 'dcterms:modified') {
         const val = m.textContent?.trim();
         if (val) metadata.modified = val;
         break;
      }
   }

   return metadata;
}

// ─── Manifest ────────────────────────────────────────────────

function parseManifest(
   opfDoc: Document,
   opfDir: string,
   archive: Record<string, Uint8Array>,
): Map<string, ManifestItem> {
   const manifest = new Map<string, ManifestItem>();

   const items = elementsByNS(opfDoc, NS_OPF, 'item');
   for (const item of items) {
      const id = item.getAttribute('id');
      const rawHref = item.getAttribute('href');
      const mediaType = item.getAttribute('media-type');

      if (!id || !rawHref || !mediaType) continue;

      const { path } = resolveHref(rawHref, opfDir);

      if (!(path in archive)) {
         throw new Error(
            `Manifest item "${id}" references href "${path}" not present in archive.`,
         );
      }

      const props = item.getAttribute('properties');
      const entry: ManifestItem = { href: path, mediaType };
      if (props) entry.properties = props.trim().split(/\s+/);

      manifest.set(id, entry);
   }

   return manifest;
}

// ─── Cover ───────────────────────────────────────────────────

function extractCover(
   opfDoc: Document,
   manifest: Map<string, ManifestItem>,
   archive: Record<string, Uint8Array>,
): Blob | undefined {
   // 1. EPUB 3: manifest item with properties containing "cover-image"
   for (const [, item] of manifest) {
      if (item.properties?.includes('cover-image')) {
         const data = archive[item.href];
         if (data) return toBlob(data, item.mediaType);
      }
   }

   // 2. EPUB 2: <meta name="cover" content="{manifest-id}">
   const metaEls = elementsByNS(opfDoc, NS_OPF, 'metadata');
   if (metaEls.length > 0) {
      const metas = elementsByNS(metaEls[0]!, NS_OPF, 'meta');
      for (const m of metas) {
         if (m.getAttribute('name') === 'cover') {
            const contentId = m.getAttribute('content');
            if (contentId) {
               const item = manifest.get(contentId);
               if (item) {
                  const data = archive[item.href];
                  if (data) return toBlob(data, item.mediaType);
               }
            }
         }
      }
   }

   return undefined;
}

// ─── Spine ───────────────────────────────────────────────────

function parseSpine(
   opfDoc: Document,
   manifest: Map<string, ManifestItem>,
): { spine: SpineItem[]; tocId: string | undefined } {
   const spineEls = elementsByNS(opfDoc, NS_OPF, 'spine');
   if (spineEls.length === 0)
      throw new Error('OPF is missing <spine> element.');

   const spineEl = spineEls[0]!;
   const tocId = spineEl.getAttribute('toc') ?? undefined;

   const spine: SpineItem[] = [];
   const itemrefs = elementsByNS(spineEl, NS_OPF, 'itemref');

   for (const ref of itemrefs) {
      const idref = ref.getAttribute('idref');
      if (!idref) continue;

      // Skip if idref has no matching manifest id (non-critical)
      if (!manifest.has(idref)) continue;

      const linearAttr = ref.getAttribute('linear');
      const linear = linearAttr?.toLowerCase() === 'no' ? false : true;

      const props = ref.getAttribute('properties');
      const entry: SpineItem = { id: idref, linear };
      if (props) entry.properties = props.trim().split(/\s+/);

      spine.push(entry);
   }

   return { spine, tocId };
}

// ─── Navigation ──────────────────────────────────────────────

function parseEpub3Nav(
   manifest: Map<string, ManifestItem>,
   archive: Record<string, Uint8Array>,
): NavigationItem[] | undefined {
   // Find the nav document: manifest item whose properties contain "nav"
   let navItem: ManifestItem | undefined;
   for (const [, item] of manifest) {
      if (item.properties?.includes('nav')) {
         navItem = item;
         break;
      }
   }
   if (!navItem) return undefined;

   const navData = archive[navItem.href];
   if (!navData) return undefined;

   const navDir = dirOf(navItem.href);
   const doc = parseXml(decodeText(navData), 'nav document');

   // Find <nav> with epub:type containing "toc" or role="doc-toc"
   // Must search across both XHTML and non-XHTML namespaces
   let navEl: Element | undefined;

   const allNavs = [
      ...Array.from(doc.getElementsByTagNameNS(NS_XHTML, 'nav')),
      ...Array.from(doc.getElementsByTagNameNS('*', 'nav')),
   ];

   for (const el of allNavs) {
      // Check epub:type attribute (with namespace or without)
      const epubType = el.getAttributeNS(NS_OPS, 'type')
         ?? el.getAttribute('epub:type');
      if (epubType) {
         const tokens = epubType.trim().split(/\s+/);
         if (tokens.includes('toc')) {
            navEl = el;
            break;
         }
      }
      // Fallback: role="doc-toc"
      if (el.getAttribute('role') === 'doc-toc') {
         navEl = el;
         break;
      }
   }

   if (!navEl) return undefined;

   // Flatten all <li> in document order from the top-level <ol>
   const items: NavigationItem[] = [];
   const allLi = navEl.getElementsByTagNameNS('*', 'li');

   for (const li of Array.from(allLi)) {
      // Look for <a> as direct or nested child
      const anchors = li.getElementsByTagNameNS('*', 'a');
      if (anchors.length > 0) {
         const a = anchors[0]!;
         const label = a.textContent?.trim();
         if (!label) continue;

         const rawHref = a.getAttribute('href');
         if (!rawHref) continue;

         const { path, fragment } = resolveHref(rawHref, navDir);
         const entry: NavigationItem = { label, href: path };
         if (fragment) entry.fragment = fragment;
         items.push(entry);
      }

      // <span>-only <li> entries (headings without href) are intentionally
      // skipped — NavigationItem.href is required.
   }

   return items.length > 0 ? items : undefined;
}

function parseNcx(
   manifest: Map<string, ManifestItem>,
   archive: Record<string, Uint8Array>,
   tocId: string | undefined,
): NavigationItem[] | undefined {
   // Find the NCX document:
   // 1. spine toc attribute references a manifest id
   // 2. fallback: manifest item with media-type application/x-dtbncx+xml
   let ncxItem: ManifestItem | undefined;

   if (tocId) ncxItem = manifest.get(tocId);

   if (!ncxItem) {
      for (const [, item] of manifest) {
         if (item.mediaType === 'application/x-dtbncx+xml') {
            ncxItem = item;
            break;
         }
      }
   }

   if (!ncxItem) return undefined;

   const ncxData = archive[ncxItem.href];
   if (!ncxData) return undefined;

   const ncxDir = dirOf(ncxItem.href);
   const doc = parseXml(decodeText(ncxData), 'NCX document');

   const items: NavigationItem[] = [];
   const navPoints = elementsByNS(doc, NS_NCX, 'navPoint');

   for (const np of navPoints) {
      // navLabel > text
      const navLabels = elementsByNS(np, NS_NCX, 'navLabel');
      if (navLabels.length === 0) continue;
      const textEls = elementsByNS(navLabels[0]!, NS_NCX, 'text');
      if (textEls.length === 0) continue;

      const label = textEls[0]!.textContent?.trim();
      if (!label) continue;

      // <content src="...">
      const contentEls = elementsByNS(np, NS_NCX, 'content');
      if (contentEls.length === 0) continue;

      const src = contentEls[0]!.getAttribute('src');
      if (!src) continue;

      const { path, fragment } = resolveHref(src, ncxDir);
      const entry: NavigationItem = { label, href: path };
      if (fragment) entry.fragment = fragment;
      items.push(entry);
   }

   return items.length > 0 ? items : undefined;
}

// ─── Main Parser ─────────────────────────────────────────────

export function parseEpub(
   archive: Record<string, Uint8Array>,
): Epub {
   // 1. Locate OPF via container.xml
   const opfPath = parseContainer(archive);
   const opfData = archive[opfPath];
   if (!opfData) {
      throw new Error(
         `OPF file "${opfPath}" referenced by container.xml not found in archive.`,
      );
   }

   const opfDir = dirOf(opfPath);
   const opfDoc = parseXml(decodeText(opfData), `OPF (${opfPath})`);

   // 2. Metadata
   const metadata = parseMetadata(opfDoc);

   // 3. Manifest
   const manifest = parseManifest(opfDoc, opfDir, archive);

   // 4. Cover
   const cover = extractCover(opfDoc, manifest, archive);

   // 5. Spine
   const { spine, tocId } = parseSpine(opfDoc, manifest);

   // 6. Navigation (prefer EPUB 3, fallback to NCX)
   const navigation = parseEpub3Nav(manifest, archive)
      ?? parseNcx(manifest, archive, tocId);

   const epub: Epub = { metadata, archive, manifest, spine };
   if (cover) epub.cover = cover;
   if (navigation) epub.navigation = navigation;

   return epub;
}
