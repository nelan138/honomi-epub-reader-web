export type Metadata = {
   title: string;
   language: string;
   identifier: string;
   modified?: string;
   creator?: string;
   publisher?: string;
};

export type SpineItem = {
   linear: boolean;
   id: string;
   properties?: string[];
};

export type ManifestItem = {
   /* Resolved Path */
   href: string;
   mediaType: string;
   properties?: string[];
};

export type NavigationItem = {
   label: string;
   href: string; // resolved path
};

export type Epub = {
   metadata: Metadata;
   cover?: Blob;
   /** Full path of the OPF file within the archive, e.g. `"OEBPS/content.opf"`. Use as the base for resolving relative paths. */
   opfPath: string;
   archive: Record<string, Uint8Array>;
   manifest: Map<string, ManifestItem>;
   spine: SpineItem[];
   navigation?: NavigationItem[];
};
