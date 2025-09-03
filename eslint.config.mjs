import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', 'lib/**', 'tests/**', '*.config.js'],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.eslint.json'
      }
    }
  },
  {
    plugins: {
      '@stylistic': stylistic
    }
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn', // or 'error'
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/quotes': ['warn', 'single'],
      '@stylistic/arrow-parens': ['warn', 'as-needed'],
      '@stylistic/block-spacing': ['warn', 'always'],
      '@stylistic/eol-last': ['warn', 'always']
    }
  }
);
