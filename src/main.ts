import { openDatabase } from './services/database/database.ts';
import './main.css';

import { createApp } from 'vue';
import App from './App.vue';

await openDatabase();

createApp(App).mount('#app');

