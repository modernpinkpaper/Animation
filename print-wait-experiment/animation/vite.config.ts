import {defineConfig} from 'vite';
import motionCanvasModule from '@motion-canvas/vite-plugin';

// The plugin ships a CJS default export; unwrap it when Node loads it as ESM.
const motionCanvas = (motionCanvasModule as any).default ?? motionCanvasModule;

export default defineConfig({
  plugins: [motionCanvas()],
  server: {port: 9000},
});
