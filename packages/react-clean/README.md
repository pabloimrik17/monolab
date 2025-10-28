# @monolab/react-clean

[![react-clean coverage](https://codecov.io/gh/pabloimrik17/monolab/badge.svg?flag=react-clean)](https://codecov.io/gh/pabloimrik17/monolab?flag=react-clean)
[![react-clean bundle](https://codecov.io/gh/pabloimrik17/monolab/graph/bundle/react-clean/badge.svg)](https://codecov.io/gh/pabloimrik17/monolab/bundle/react-clean)

MVVM pattern library using Inversify (IoC) and RxJS for reactive state management in React.

## Installation

```bash
npm install @monolab/react-clean
# or
pnpm add @monolab/react-clean
```

## Usage

```typescript
import { BaseViewModel } from "@monolab/react-clean";
import { injectable } from "inversify";

@injectable()
class MyViewModel extends BaseViewModel {
    // Your view model logic
}
```

## License

MIT
