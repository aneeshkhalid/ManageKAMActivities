/**
 * @type {import('electron-builder').Configuration}
 */
module.exports = {
  appId: 'com.ceim.portal',
  productName: 'CEIM Portal',
  copyright: 'UAE Client Engagement & Implementation Management Portal',
  directories: {
    output: 'release',
    buildResources: 'resources'
  },
  files: [
    'out/**/*',
    'resources/**/*',
    '!node_modules/**/{CHANGELOG.md,README.md,README,readme.md,readme}',
    '!node_modules/**/{test,__tests__,tests,powered-test,example,examples}',
    '!node_modules/.bin'
  ],
  extraResources: [
    {
      from: 'node_modules/sql.js/dist/sql-wasm.wasm',
      to: 'sql-wasm.wasm'
    }
  ],
  win: {
    target: [
      {
        target: 'dir',
        arch: ['x64']
      }
    ],
    icon: 'resources/icon.ico'
  }
}
