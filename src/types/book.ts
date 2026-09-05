import type {
   ManifestItem,
   Metadata,
   NavigationItem,
   SpineItem,
   SupportedEpubVersion,
} from '@src/types/epub';

/**
 * * Represents a record in the database.
 */
type BookRecord = {
   id: number;
   shelfId: number;
   progress: number;

   epubFile: Blob;
   version: SupportedEpubVersion;

   opfPath: string;
   manifest: Map<string, ManifestItem>;
   navigation: NavigationItem[];
   spine: SpineItem[];

   metadata: Metadata;
   cover?: Blob;
};

/**
 * Use for UI
 */
type UIBookCard = Pick<
   BookRecord,
   'id' | 'shelfId' | 'progress' | 'metadata' | 'cover'
>;

type ContentBook = Omit<BookRecord, keyof UIBookCard>;

export type { BookRecord, UIBookCard, ContentBook };
