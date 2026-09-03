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
   children: NavigationItem[];

   fragment?: string; // * Optional fragment identifier (e.g., #section1)
};

export type Metadata = {
   title: string;
   creator: string;
   language: string;
   publisher?: string;
   identifier?: string;
   description?: string;
   subject?: string[];
};
