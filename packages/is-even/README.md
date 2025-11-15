# @m0n0lab/is-even

[![npm version](https://img.shields.io/npm/v/@m0n0lab/is-even.svg)](https://www.npmjs.com/package/@m0n0lab/is-even)
[![is-even coverage](https://codecov.io/gh/pabloimrik17/monolab/badge.svg?flag=is-even)](https://codecov.io/gh/pabloimrik17/monolab?flag=is-even)
[![is-even bundle](https://codecov.io/gh/pabloimrik17/monolab/graph/bundle/is-even/badge.svg)](https://codecov.io/gh/pabloimrik17/monolab/bundle/is-even)

A simple, well-tested utility to check if a number is even. Perfect for number validation and mathematical operations.

## Features

-   🎯 Simple and intuitive API
-   ✅ Fully typed with TypeScript
-   🧪 100% test coverage
-   📦 Zero dependencies
-   ⚡ Lightweight and fast
-   🔒 Secure and reliable
-   🚀 Production ready

## Installation

### npm

```bash
npm install @m0n0lab/is-even
```

### pnpm

```bash
pnpm add @m0n0lab/is-even
```

### JSR

```bash
npx jsr add @m0n0lab/is-even
```

## Usage

```typescript
import { isEven, isNotEven } from "@m0n0lab/is-even";

// Check if a number is even
console.log(isEven(2)); // true
console.log(isEven(3)); // false
console.log(isEven(0)); // true

// Check if a number is not even (odd)
console.log(isNotEven(3)); // true
console.log(isNotEven(2)); // false
console.log(isNotEven(1)); // true
```

## API

### `isEven(value: number): boolean`

Returns `true` if the number is even, `false` otherwise.

### `isNotEven(value: number): boolean`

Returns `true` if the number is not even (i.e., odd), `false` otherwise.

## License

MIT
