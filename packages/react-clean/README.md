# @m0n0lab/react-clean

[![npm version](https://img.shields.io/npm/v/@m0n0lab/react-clean.svg)](https://www.npmjs.com/package/@m0n0lab/react-clean)
[![react-clean coverage](https://codecov.io/gh/pabloimrik17/monolab/badge.svg?flag=react-clean)](https://codecov.io/gh/pabloimrik17/monolab?flag=react-clean)
[![react-clean bundle](https://codecov.io/gh/pabloimrik17/monolab/graph/bundle/react-clean/badge.svg)](https://codecov.io/gh/pabloimrik17/monolab/bundle/react-clean)

MVVM pattern library using Inversify (IoC) and RxJS for reactive state management in React applications.

## Features

-   🚀 Production ready
-   📘 Well documented

## Installation

### npm

```bash
npm install @m0n0lab/react-clean
```

### pnpm

```bash
pnpm add @m0n0lab/react-clean
```

### JSR

```bash
npx jsr add @m0n0lab/react-clean
```

## Usage

```typescript
import { BaseViewModel } from "@m0n0lab/react-clean";
import { injectable } from "inversify";

@injectable()
class MyViewModel extends BaseViewModel {
    // Your view model logic
}
```

## License

MIT
