import eslintJS from '@eslint/js';
import eslintPluginImport from 'eslint-plugin-import';
import globals from 'globals';

export default [
  // Configurações recomendadas do ESLint
  eslintJS.configs.recommended,
  {
    files: ['**/*.js'],
    plugins: {
      import: eslintPluginImport,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      curly: ['error', 'multi-line', 'consistent'],
      'brace-style': ['error', '1tbs', { 'allowSingleLine': false }],

      indent: ['error', 2, {
        'SwitchCase': 1,
        'ignoredNodes': ['TemplateLiteral']
      }],
      'block-spacing': 'error',
      'lines-between-class-members': ['error', 'always'],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: 'block-like', next: '*' }
      ],
      eqeqeq: 'warn',
      'no-throw-literal': 'warn',
      semi: ['warn', 'never'],
      'no-warning-comments': 'error',
      'no-console': ['error', { 
        allow: ['warn', 'error', 'info', 'debug', 'log'] 
      }],
      'no-unused-vars': 'off',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'object-curly-newline': ['error', {
        ObjectExpression: { 
          multiline: true, 
          minProperties: 1 // Sempre quebra mesmo com 1 propriedade
        },
        ObjectPattern: { 
          multiline: true 
        },
        ImportDeclaration: { 
          multiline: true 
        },
        ExportDeclaration: { 
          multiline: true 
        }
      }],
      'object-property-newline': ['error', {
        allowAllPropertiesOnSameLine: false
      }],
    },
  },
];
