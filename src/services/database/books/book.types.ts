import type {
   ManifestItem,
   Metadata,
   NavigationItem,
   SpineItem,
   SupportedEpubVersion,
} from '@src/services/epub/epub-book.types.ts';

export type BookRecord = {
   id: number;
   categoryId: number;
   progress: number;

   epubFile: Blob;
   version: SupportedEpubVersion;

   opfPath: string;
   manifest: Map<string, ManifestItem>;
   navigation: NavigationItem[];
   spine: SpineItem[];

   metadata?: Metadata;
   cover?: Blob;
};
