import '@fortawesome/fontawesome-free/css/all.min.css';

import { createApp } from 'vue';
import App from './App.vue';
import router from '@src/router.ts';

const app = createApp(App);
app.use(router);
app.mount('body');
