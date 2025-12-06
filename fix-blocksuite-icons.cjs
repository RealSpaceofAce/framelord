// esbuild plugin to fix BlockSuite icon typo
module.exports = function fixBlockSuiteIconsPlugin() {
  return {
    name: 'fix-blocksuite-icons',
    setup(build) {
      const fs = require('fs');

      build.onLoad({ filter: /@blocksuite.*\.(js|mjs)$/ }, async (args) => {
        let contents = await fs.promises.readFile(args.path, 'utf8');

        if (contents.includes('CheckBoxCkeckSolidIcon')) {
          contents = contents.replace(/CheckBoxCkeckSolidIcon/g, 'CheckBoxCheckSolidIcon');

          return {
            contents,
            loader: 'js'
          };
        }
      });
    }
  };
};
