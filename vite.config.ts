import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'fs/promises';

// Plugin to fix BlockSuite icon typo
function fixBlockSuiteIconTypo(): Plugin {
  return {
    name: 'fix-blocksuite-icon-typo',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('@blocksuite') && code.includes('CheckBoxCkeckSolidIcon')) {
        return {
          code: code.replace(/CheckBoxCkeckSolidIcon/g, 'CheckBoxCheckSolidIcon'),
          map: null
        };
      }
    }
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3001,
      },
      plugins: [
        fixBlockSuiteIconTypo(),
        react()
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      },
      build: {
        commonjsOptions: {
          include: [/node_modules/],
        }
      },
      optimizeDeps: {
        include: [
          '@blocksuite/store',
          '@blocksuite/blocks',
          '@blocksuite/presets',
        ],
        esbuildOptions: {
          plugins: [{
            name: 'fix-blocksuite-icons-esbuild',
            setup(build) {
              build.onLoad({ filter: /@blocksuite.*\.(js|mjs)$/ }, async (args) => {
                let contents = await readFile(args.path, 'utf8');
                if (contents.includes('CheckBoxCkeckSolidIcon')) {
                  contents = contents.replace(/CheckBoxCkeckSolidIcon/g, 'CheckBoxCheckSolidIcon');
                  return { contents, loader: 'js' };
                }
              });
            }
          }]
        }
      }
    };
});
