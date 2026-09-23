declare module 'electron' {
  export const remote:import('./native-print').DesktopBridge;
}
