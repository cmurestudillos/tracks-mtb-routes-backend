import js from '@eslint/js';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  // Reglas JS recomendadas
  js.configs.recommended,

  // Configuración principal para archivos JS del backend (Node.js / CommonJS)
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.commonjs,
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Prettier como regla de ESLint
      'prettier/prettier': 'error',

      // Buenas prácticas
      // config/index.js usa console.error en bootstrap (antes de que exista el logger)
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'eqeqeq': ['error', 'always'],
      'curly': 'error',
      'no-var': 'error',
      'prefer-const': 'error',

      // Seguridad
      'no-eval': 'error',
      'no-implied-eval': 'error',
    },
  },

  // Desactivar reglas de formato que Prettier maneja
  prettierConfig,

  // Ignorar directorios generados
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', 'public/**'],
  },
];
