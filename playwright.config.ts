import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'tests/browser',
  timeout:60_000,
  workers:1,
  use:{baseURL:'http://127.0.0.1:5184',viewport:{width:1440,height:1000},launchOptions:{executablePath:process.env.CHROMIUM_PATH}},
  webServer:{command:'node scripts/serve.mjs',url:'http://127.0.0.1:5184',reuseExistingServer:!process.env.CI},
});
