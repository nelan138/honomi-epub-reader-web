export type Path = string;
export type ResolvedPath = string;

export type Metadata = {
   title: string;
   creator: string;
   publisher: string;
   language: string;
   cover: Blob;
};

export type EpubContext = {
   fileArchive: Record<string, Uint8Array>;
   opfPath: ResolvedPath;
   opfDocument: Document;
   manifest: ManifestItem[];
   version: 2 | 3;
};

export type ManifestItem = {
   href: Path;
   id: Idref;
   resolvedHref: ResolvedPath;
   mediaType: string;
   properties?: string[];
};

export type Idref = string;
export type SpineItem = {
   idref: Idref;
   // Can treat this as resource path to use in assets map
   resolvedHref: ResolvedPath;
   mediaType: string;

   linear: boolean; // false <=> (footnotes, appendices, etc.)
};

export type RawXTHMLContent = string;
export type Book = {
   // Metadata
   title: string;
   creator: string;
   publisher: string;
   language: string;
   cover: Blob;

   // Book Content
   spine: SpineItem[];
   assets: Record<ResolvedPath, Uint8Array>;
   /** Map<Idref, RawXTHMLContent> */
   spineItemContentMap: Map<Idref, RawXTHMLContent>;
   totalCharacterCount: number;
};

/**
 * * Represents a record in the database.
 */
export type BookRecord = Book & {
   id: number;
   shelfId: number;
   /** count of how many chars user has read of this book */
   readCharacterCount: number;
};

/**
 * Use for UI
 */
export type BookCard = Pick<
   BookRecord,
   | 'id'
   | 'shelfId'
   | 'readCharacterCount'
   | 'totalCharacterCount'
   | 'cover'
   | 'title'
   | 'creator'
   | 'publisher'
   | 'language'
>;
