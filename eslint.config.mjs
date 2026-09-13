import obsidianmd from 'eslint-plugin-obsidianmd';
export default [
  {ignores:['node_modules/**','build/**','release/**','main.js','tests/**','scripts/**','*.config.*']},
  ...obsidianmd.configs.recommended,
  {files:['src/**/*.ts'],languageOptions:{parserOptions:{projectService:true},globals:{FRAME_RUNTIME:'readonly'}},rules:{'obsidianmd/ui/sentence-case':['warn',{brands:['Print Studio','Markdown','Obsidian','HTML','PDF']}] }},
  // The sandboxed print frame has no Obsidian globals.
  {files:['src/frame.ts'],rules:{'obsidianmd/prefer-create-el':'off'}},
];
