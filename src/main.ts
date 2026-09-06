import '@fortawesome/fontawesome-free/css/all.min.css';
import '@src/main.css';

import { createApp } from 'vue';
import App from './App.vue';
import router from '@src/router';

const app = createApp(App);
app.use(router);
app.mount('body');
