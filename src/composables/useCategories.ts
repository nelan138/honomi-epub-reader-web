import { onMounted, ref, toRaw } from 'vue';
import type { CategoryRecord } from '@src/types/category';
import {
   addCategoryToDB,
   collapseCategoryInDB,
   deleteCategoryFromDB,
   expandCategoryInDB,
   getCategoriesFromDB,
   renameCategoryInDB,
} from '@src/services/database/categoryRepo.ts';

function useCategories() {
   const categories = ref<CategoryRecord[]>([]);

   onMounted(async () => {
      categories.value = await getCategoriesFromDB();
   });

   const addCategory = async (category: Omit<CategoryRecord, 'id' | 'displayOrder'>) => {
      const { id, displayOrder } = await addCategoryToDB(category);
      const addedCategory = { id, displayOrder, ...category };
      categories.value.push(addedCategory);
   };
   const deleteCategory = async (categoryId: number) => {
      const targetCategory = categories.value.find((category) => category.id === categoryId);
      if (!targetCategory) throw new Error('Category does not exist!');

      const copy = structuredClone(toRaw(targetCategory));
      try {
         await deleteCategoryFromDB(categoryId);
      }
      catch (error) {
         // Rollback UI
         categories.value = [...categories.value, copy];
         alert('Failed to delete category: ' + (error as Error).message);
      }
   };
   const renameCategory = (categoryId: number, newName: string) => {
      const targetCategory = categories.value.find((category) => category.id === categoryId);
      if (!targetCategory) throw new Error('Category does not exist!');

      const oldName = targetCategory.name;
      // Update UI
      targetCategory.name = newName;
      try {
         renameCategoryInDB(categoryId, newName);
      }
      catch (error) {
         // Rollback UI
         targetCategory.name = oldName;
         alert('Failed to rename category: ' + (error as Error).message);
      }
   };
   const collapseCategory = (categoryId: number) => {
      const targetCategory = categories.value.find((category) => category.id === categoryId);
      if (!targetCategory) throw new Error('Category does not exist!');

      const oldState = targetCategory.expanded;
      // Update UI
      targetCategory.expanded = false;
      try {
         collapseCategoryInDB(categoryId);
      }
      catch (error) {
         // Rollback UI
         targetCategory.expanded = oldState;
         alert('Failed to collapse category: ' + (error as Error).message);
      }
   };
   const expandCategory = (categoryId: number) => {
      const targetCategory = categories.value.find((category) => category.id === categoryId);
      if (!targetCategory) throw new Error('Category does not exist!');
      const oldState = targetCategory.expanded;
      // Update UI
      targetCategory.expanded = true;
      try {
         expandCategoryInDB(categoryId);
      }
      catch (error) {
         // Rollback UI
         targetCategory.expanded = oldState;
         alert('Failed to expand category: ' + (error as Error).message);
      }
   };

   return { categories, addCategory, deleteCategory, renameCategory, collapseCategory, expandCategory };
}

export default useCategories;
