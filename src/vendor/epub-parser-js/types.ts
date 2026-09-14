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
   href: string;
   mediaType: string;
   properties?: string[];
};

export type NavigationItem = {
   label: string;
   href: string;
   fragment?: string;
};

export type Epub = {
   metadata: Metadata;
   cover?: Blob;
   archive: Record<string, Uint8Array>;
   manifest: Map<string, ManifestItem>;
   spine: SpineItem[];
   navigation?: NavigationItem[];
};
