
![MonoLab](monolab-logo.png)

[![CI](https://github.com/pabloimrik17/monolab/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/pabloimrik17/monolab/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Monorepo](https://img.shields.io/badge/Monorepo-Nx-blue)](https://nx.dev)
[![Nx Cloud](https://img.shields.io/badge/Nx%20Cloud-Enabled-blue?logo=nx)](https://nx.app/)
[![Node.js](https://img.shields.io/badge/Node.js-22.18.0-green?logo=node.js)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10.14.0-orange?logo=pnpm)](https://pnpm.io/)
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/pabloimrik17/monolab?utm_source=oss&utm_medium=github&utm_campaign=pabloimrik17%2Fmonolab&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)
[![Maintained with](https://img.shields.io/badge/Maintained%20with-❤️-red)](https://github.com/pabloimrik17/monolab)

## Development Setup

### Node.js Installation

This project uses Node.js version 22.18.0. To install and use this specific version:

1. Make sure you have [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm) installed
2. Clone the repository and navigate to the project directory
3. Run the following command to install and use the correct Node.js version:

```bash
nvm use
```

This will automatically read the `.nvmrc` file and switch to Node.js version 22.18.0.

### Package Manager Setup

This project uses pnpm as the package manager. To activate pnpm version 10.14.0 using corepack:

1. Make sure you have corepack enabled:

```bash
corepack enable
```

2. Activate pnpm version 10.14.0:

```bash
corepack prepare pnpm@10.14.0 --activate
```

3. Verify the installation:

```bash
pnpm --version
```

The output should be `10.14.0`.
