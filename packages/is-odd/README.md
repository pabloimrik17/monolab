# @m0n0lab/is-odd

[![npm version](https://img.shields.io/npm/v/@m0n0lab/is-odd.svg)](https://www.npmjs.com/package/@m0n0lab/is-odd)
[![is-odd coverage](https://codecov.io/gh/pabloimrik17/monolab/badge.svg?flag=is-odd)](https://codecov.io/gh/pabloimrik17/monolab?flag=is-odd)
[![is-odd bundle](https://codecov.io/gh/pabloimrik17/monolab/graph/bundle/is-odd/badge.svg)](https://codecov.io/gh/pabloimrik17/monolab/bundle/is-odd)

A simple, well-tested utility to check if a number is odd. Perfect for number validation, mathematical operations, and conditional logic.

## Features

-   🎯 Simple and intuitive API
-   ✅ Fully typed with TypeScript
-   🧪 100% test coverage
-   📦 Zero dependencies
-   ⚡ Lightweight and fast
-   🔒 Secure and reliable
-   🚀 Production ready
-   📘 Well documented

## Installation

### npm

```bash
npm install @m0n0lab/is-odd
```

### pnpm

```bash
pnpm add @m0n0lab/is-odd
```

### JSR

```bash
npx jsr add @m0n0lab/is-odd
```

## Usage

```typescript
import { isOdd, isNotOdd } from "@m0n0lab/is-odd";

// Check if a number is odd
console.log(isOdd(3)); // true
console.log(isOdd(2)); // false

// Check if a number is not odd (even)
console.log(isNotOdd(2)); // true
console.log(isNotOdd(3)); // false
```

## API

### `isOdd(value: number): boolean`

Returns `true` if the number is odd, `false` otherwise.

### `isNotOdd(value: number): boolean`

Returns `true` if the number is not odd (i.e., even), `false` otherwise.

## License

MIT
