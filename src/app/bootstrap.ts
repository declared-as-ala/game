import { App } from './App';

window.addEventListener('DOMContentLoaded', async () => {
  const app = new App();
  await app.start();
});
