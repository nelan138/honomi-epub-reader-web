export type {
   Epub,
   ManifestItem,
   Metadata,
   NavigationItem,
   SpineItem,
} from './types.ts';

import type { Epub } from './types.ts';
import { extractArchive } from './archive.ts';
import { parseEpub } from './parser.ts';

/**
 * Parse an EPUB file into a structured `Epub` object.
 *
 * Throws on: oversized/malformed archive, missing container.xml/OPF,
 * missing required metadata, or path traversal.
 * Does not throw on missing cover, navigation, or optional metadata.
 */
export async function makeBook(file: File): Promise<Epub> {
   const archive = await extractArchive(file);
   return parseEpub(archive);
}
