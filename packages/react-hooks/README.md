# @monolab/react-hooks

[![react-hooks coverage](https://codecov.io/gh/pabloimrik17/monolab/badge.svg?flag=react-hooks)](https://codecov.io/gh/pabloimrik17/monolab?flag=react-hooks)
[![react-hooks bundle](https://codecov.io/gh/pabloimrik17/monolab/graph/bundle/react-hooks/badge.svg)](https://codecov.io/gh/pabloimrik17/monolab/bundle/react-hooks)

React lifecycle hooks for functional components.

## Installation

```bash
npm install @monolab/react-hooks
# or
pnpm add @monolab/react-hooks
```

## Usage

```typescript
import { useDidMount, useWillUnmount } from "@monolab/react-hooks";

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

## License

MIT
