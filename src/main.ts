import '@fortawesome/fontawesome-free/css/all.min.css';
import '@src/main.css';

import { router } from '@src/router';
import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);
app.use(router);
app.mount('body');
