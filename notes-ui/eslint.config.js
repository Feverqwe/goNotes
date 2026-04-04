import gravityConfig from '@gravity-ui/eslint-config';
import prettierConfig from '@gravity-ui/eslint-config/prettier';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  ...gravityConfig,
  ...prettierConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/parameter-properties': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-shadow': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'consistent-return': 'off',
      'no-param-reassign': 'off',
      'no-nested-ternary': 'off',
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
    },
  },
];
