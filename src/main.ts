import '@fortawesome/fontawesome-free/css/all.min.css';
import '@src/main.css';

import { router } from '@src/router';
import App from './App.vue';
import { createPinia } from 'pinia';

/* *** */

const app = createApp(App);

const pinia = createPinia()

app.use(router);
app.use(pinia);

app.mount('#app');
