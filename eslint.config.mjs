import obsidianmd from 'eslint-plugin-obsidianmd';
const restrictedGlobals = obsidianmd.configs.recommended.find(config => config.rules?.['no-restricted-globals']).rules['no-restricted-globals'];
export default [
  {ignores:['node_modules/**','build/**','release/**','main.js','tests/**','scripts/**','*.config.*']},
  ...obsidianmd.configs.recommended,
  {files:['src/**/*.ts','demo/**/*.ts'],languageOptions:{parserOptions:{projectService:true},globals:{FRAME_RUNTIME:'readonly'}},rules:{'obsidianmd/ui/sentence-case':['warn',{brands:['Print Studio','Markdown','Obsidian','HTML','PDF']}] }},
  // Native DOM is required in the isolated frame and standalone browser adapter.
  // Neither environment loads Obsidian; shared plugin UI uses the native adapter.
  {files:['src/frame.ts','demo/ui.ts'],rules:{'obsidianmd/prefer-create-el':'off'}},
  // Keep every recommended global restriction except browser-only demo storage.
  {files:['demo/demo.ts'],rules:{'no-restricted-globals':restrictedGlobals.filter(option => option?.name !== 'localStorage')}},
  {files:['demo/**/*.ts'],rules:{'import/no-extraneous-dependencies':['warn',{devDependencies:true}]}},
];
