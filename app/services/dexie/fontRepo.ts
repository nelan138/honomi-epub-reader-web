import { db } from './database';

export async function addFontToDB(file: File) {
   return db.fonts.add({
      name: file.name.replace(/\.[^.]+$/, ''),
      file,
   });
}

export async function getFontsFromDB() {
   return db.fonts.toArray();
}
