const commonjs = require('rollup-plugin-commonjs')
const nodeResolve = require('rollup-plugin-node-resolve')
const terser = require('rollup-plugin-terser').terser

module.exports = {
  input: 'src/sporadic/index.js',
  output: {
    file: 'dist/index.js',
    format: 'iife',
    name: 'sporadic',
    compact: true,
    exports: 'named'
  },
  plugins: [
    nodeResolve({
      module: true,
      main: true,
      browser: true
    }),
    commonjs({
      exclude: ['node_modules/**'],
      sourceMap: false
    }),
    terser({
      sourcemap: false
    })
  ]
}
