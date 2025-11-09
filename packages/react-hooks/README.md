# @m0n0lab/react-hooks

[![npm version](https://img.shields.io/npm/v/@m0n0lab/react-hooks.svg)](https://www.npmjs.com/package/@m0n0lab/react-hooks)
[![react-hooks coverage](https://codecov.io/gh/pabloimrik17/monolab/badge.svg?flag=react-hooks)](https://codecov.io/gh/pabloimrik17/monolab?flag=react-hooks)
[![react-hooks bundle](https://codecov.io/gh/pabloimrik17/monolab/graph/bundle/react-hooks/badge.svg)](https://codecov.io/gh/pabloimrik17/monolab/bundle/react-hooks)

A collection of React lifecycle hooks for functional components. Simplify your React development with clean, reusable hooks.

## Installation

### npm

```bash
npm install @m0n0lab/react-hooks
```

### pnpm

```bash
pnpm add @m0n0lab/react-hooks
```

### JSR

```bash
npx jsr add @m0n0lab/react-hooks
```

## Usage

```typescript
import { useDidMount, useWillUnmount } from "@m0n0lab/react-hooks";

function MyComponent() {
    useDidMount(() => {
        console.log("Component mounted");
    });

    useWillUnmount(() => {
        console.log("Component will unmount");
    });

    return <div>Hello World</div>;
}
```

## API

### `useDidMount(callback: () => void): void`

Executes the callback once when the component mounts.

### `useWillUnmount(callback: () => void): void`

Executes the callback when the component is about to unmount.

## License

MIT
