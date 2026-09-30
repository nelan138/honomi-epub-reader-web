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
 *
 * ! section.content: contains a single root tag
 * each p tag in section.content has:
 * 1. [data-characters] = character count of it self
 * 2. [data-characters-read] = character count of all previous <p> (not counting itself)
 */
export type Book = {
   cover?: Blob;

   metadata: {
      title: string;
      creator: string;
      publisher: string;
      language: string;
   };

   totalCharacters: number;

   sections: Section[];

   navigation?: NavigationItem[];

   images: Record<string, Blob>;
};
