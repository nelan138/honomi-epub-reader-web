import './main.css';

import { createApp } from 'vue';
import App from './App.vue';
import { db } from '@src/services/database/db.ts';

await db.open();
createApp(App).mount('#app');
