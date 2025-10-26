<!-- markdownlint-disable MD041 -->

![MonoLab](monolab-logo.png)
[![CI - Dev](https://github.com/pabloimrik17/monolab/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/pabloimrik17/monolab/actions/workflows/ci.yml)
[![CI - Main](https://github.com/pabloimrik17/monolab/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/pabloimrik17/monolab/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/pabloimrik17/monolab/branch/develop/graph/badge.svg?token=F5RXGDOQ8S)](https://codecov.io/gh/pabloimrik17/monolab)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Monorepo](https://img.shields.io/badge/Monorepo-Nx-blue)](https://nx.dev)
[![Nx Cloud](https://img.shields.io/badge/Nx%20Cloud-Enabled-blue?logo=nx)](https://nx.app/)
[![Node.js](https://img.shields.io/badge/Node.js-22.17.0-green?logo=node.js)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10.13.1-orange?logo=pnpm)](https://pnpm.io/)
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/pabloimrik17/monolab?utm_source=oss&utm_medium=github&utm_campaign=pabloimrik17%2Fmonolab&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)
[![Maintained with](https://img.shields.io/badge/Maintained%20with-❤️-red)](https://github.com/pabloimrik17/monolab)

<!-- markdownlint-enable MD041 -->

## Development Setup

### Node.js Installation

This project uses Node.js version 22.17.0. To install and use this specific version:

<!-- markdownlint-disable MD013 MD029 -->

1. Make sure you have [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm) installed
2. Clone the repository and navigate to the project directory
3. Run the following command to install and use the correct Node.js version:
 <!-- markdownlint-enable MD013 MD029 -->

```bash
nvm use
```

This will automatically read the `.nvmrc` file and switch to Node.js version 22.17.0.

### Package Manager Setup

<!-- markdownlint-disable MD013 MD029 -->

This project uses pnpm as the package manager. To activate pnpm version 10.13.1 using corepack:

1. Make sure you have corepack enabled:

```bash
corepack enable
```

2. Activate pnpm version 10.13.1:

```bash
corepack prepare pnpm@10.13.1 --activate
```

3. Verify the installation:
 <!-- markdownlint-enable MD013 MD029 -->

```bash
pnpm --version
```

The output should be `10.13.1`.
