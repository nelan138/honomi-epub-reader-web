export type Path = string;
export type ResourcePath = string;
export type ManifestItemId = string;
export type SupportedEpubVersion = 2 | 3;

export type ManifestItem = {
   href: Path;
   resolvedPath: ResourcePath;
   mediaType: string;
   properties: string[];
};

export type SpineItem = {
   idref: ManifestItemId;
   linear: boolean; // * false <=> (footnotes, appendices, etc.)
};

export type NavigationItem = {
   label: string;
   href: Path;
   resolvedPath: ResourcePath;
   fragment: string | null; // * Optional fragment identifier (e.g., #section1)
   children: NavigationItem[] | [];
};

export type Metadata = {
   title: string;
   creator: string;
   publisher: string;
   language: string;
   identifier: string | null;
   description: string | null;
   subject: string[] | null;
};
