/** @type {import('jest-expo').JestPreset} */
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      preset: 'ts-jest',
      testMatch: [
        '<rootDir>/src/lib/**/__tests__/**/*.test.ts',
        '<rootDir>/src/infrastructure/repositories/**/__tests__/**/*.test.ts',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { strict: false } }],
      },
    },
    {
      displayName: 'expo',
      preset: 'jest-expo',
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
      ],
      testMatch: ['<rootDir>/app/**/__tests__/**/*.test.tsx'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
  ],
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    'src/infrastructure/repositories/**/*.ts',
    '!src/**/__tests__/**',
  ],
};
