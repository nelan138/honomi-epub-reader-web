import { openDatabase } from './services/database/database';
import './main.css';

import { createApp } from 'vue';
import App from './App.vue';

await openDatabase();

createApp(App).mount('#app');
