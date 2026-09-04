import { createRouter, createWebHistory } from 'vue-router';
import LibraryView from '@src/views/LibraryView.vue';
import NotFoundView from '@src/views/NotFoundView.vue';
import ReaderView from '@src/views/ReaderView.vue';

const router = createRouter({
   history: createWebHistory(),
   routes: [
      { path: '/', component: LibraryView },
      { path: '/read/:bookId', component: ReaderView },
      { path: '/:pathMatch(.*)*', component: NotFoundView },
   ],
});

export default router;
