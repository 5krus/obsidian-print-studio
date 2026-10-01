import obsidianmd from 'eslint-plugin-obsidianmd';
export default [
  {ignores:['node_modules/**','build/**','release/**','main.js','tests/**','scripts/**','*.config.*']},
  ...obsidianmd.configs.recommended,
  // These modules are evaluated only by the guarded desktop import in main.ts.
  // test-mobile-build executes the shipped bundle without Node or Electron.
  {files:['src/cups-print.ts','src/native-print.ts','src/desktop-printer.ts'],languageOptions:{globals:{process:'readonly',NodeJS:'readonly'}},rules:{'obsidianmd/no-nodejs-modules':'off'}},
  {files:['src/**/*.ts'],languageOptions:{parserOptions:{projectService:true},globals:{FRAME_RUNTIME:'readonly'}},rules:{'obsidianmd/ui/sentence-case':['warn',{brands:['Print Studio','Markdown','Obsidian','HTML','PDF']}] }},
];
