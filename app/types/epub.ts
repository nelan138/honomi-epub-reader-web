export type Section = {
   content: string; // ! html string
   idref: string;
   path: string; // ! absolute path in archive
};

export type NavigationItem = {
   label: string;
   href: string; // ! absolute path in archive
   // no children
};

/**
 * * What parsed from parser
 */
export type Book = {
   cover?: Blob;
   metadata: {
      title: string;
      creator: string;
      publisher: string;
      language: string;
   };
   // ! each section contains exactly one <body> tag as html string
   sections: Section[];

   navigation?: NavigationItem[];

   totalCharacters: number;
   images: Record<string, Blob>;
};
