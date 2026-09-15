import { unzipSync } from 'fflate';

/* *** */

const MAX_COMPRESSED_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_DECOMPRESSED_SIZE = 200 * 1024 * 1024; // 200 MB
const MAX_ENTRY_SIZE = 30 * 1024 * 1024; // 30 MB
const MAX_ENTRY_COUNT = 2000;

export async function extractArchive(
   file: File,
): Promise<Record<string, Uint8Array>> {
   if (file.size > MAX_COMPRESSED_SIZE) {
      throw new Error(
         `EPUB exceeds maximum compressed size of 100 MB (got ${
            (file.size / 1024 / 1024).toFixed(1)
         } MB).`,
      );
   }

   const buffer = new Uint8Array(await file.arrayBuffer());
   const raw = unzipSync(buffer);

   const archive: Record<string, Uint8Array> = {};
   let totalDecompressed = 0;
   let entryCount = 0;

   for (const [path, data] of Object.entries(raw)) {
      // Skip directory entries
      if (path.endsWith('/')) continue;

      entryCount++;
      if (entryCount > MAX_ENTRY_COUNT) {
         throw new Error(
            `EPUB exceeds maximum entry count of ${MAX_ENTRY_COUNT}.`,
         );
      }

      if (data.byteLength > MAX_ENTRY_SIZE) {
         throw new Error(
            `Entry "${path}" exceeds maximum individual size of 30 MB (got ${
               (data.byteLength / 1024 / 1024).toFixed(1)
            } MB).`,
         );
      }

      totalDecompressed += data.byteLength;
      if (totalDecompressed > MAX_DECOMPRESSED_SIZE) {
         throw new Error(
            `EPUB exceeds maximum total decompressed size of 200 MB.`,
         );
      }

      // Normalize separators
      archive[path.replace(/\\/g, '/')] = data;
   }

   return archive;
}
