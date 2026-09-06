export type Path = string;
export type ResolvedPath = string;

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

export type NavigationItem = {
   label: string;
   href: Path;
   resolvedHref: ResolvedPath;

   children?: NavigationItem[];
   fragment?: string; // Optional fragment identifier (e.g., #section1)
};

export type RawXTHMLContent = string;
export type EpubBook = {
   // Metadata
   title: string;
   creator: string;
   publisher: string;
   language: string;
   cover: Blob;

   // Book Content
   navigation: NavigationItem[];
   spine: SpineItem[];
   assets: Record<ResolvedPath, Uint8Array>;
   spineItemContentMap: Map<Idref, RawXTHMLContent>;
};

/**
 * * Represents a record in the database.
 */
export type BookRecord = EpubBook & {
   id: number;
   shelfId: number;
   progress: number;
};

/**
 * Use for UI
 */
export type UIBookCard = Pick<
   BookRecord,
   | 'id'
   | 'shelfId'
   | 'progress'
   | 'cover'
   | 'title'
   | 'creator'
   | 'publisher'
   | 'language'
>;
