import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig(base,{
  testMatch:'mobile.spec.ts',
  outputDir:'test-results/mobile-webkit',
  use:{browserName:'webkit',launchOptions:{executablePath:undefined,timeout:20000},hasTouch:true},
});
