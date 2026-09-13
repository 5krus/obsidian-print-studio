import obsidianmd from 'eslint-plugin-obsidianmd';
export default [
  {ignores:['node_modules/**','build/**','release/**','main.js','demo/**','tests/**','scripts/**','*.config.*']},
  ...obsidianmd.configs.recommended,
  {files:['src/**/*.ts'],languageOptions:{parserOptions:{projectService:true},globals:{FRAME_RUNTIME:'readonly'}},rules:{'obsidianmd/ui/sentence-case':['warn',{brands:['Print Studio','Markdown','Obsidian','HTML','PDF']}] }},
  // These modules also run in the standalone demo and isolated iframe, where
  // Obsidian's createEl helpers do not exist. Native adapters use the real API.
  {files:['src/document.ts','src/frame.ts','src/panel.ts'],rules:{'obsidianmd/prefer-create-el':'off'}},
];
