import type {
   ManifestItem,
   Metadata,
   NavigationItem,
   SpineItem,
   SupportedEpubVersion,
} from '@src/epub/epub-book.types.ts';

export type BookDraft = {
   categoryId: number;
   progress: number;

   epubFile: Blob;
   version: SupportedEpubVersion;

   metadata: Metadata;
   cover: Blob | null;

   opfPath: string;
   manifest: Map<string, ManifestItem>;
   navigation: NavigationItem[];
   spine: SpineItem[];
};

export type BookRecord = BookDraft & {
   id: number;
};
