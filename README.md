
![MonoLab](monolab-logo.png)

## Development Setup

### Node.js Installation

This project uses Node.js version 22.14.0. To install and use this specific version:

1. Make sure you have [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm) installed
2. Clone the repository and navigate to the project directory
3. Run the following command to install and use the correct Node.js version:

```bash
nvm use
```

This will automatically read the `.nvmrc` file and switch to Node.js version 22.14.0.

### Package Manager Setup

This project uses pnpm as the package manager. To activate pnpm version 10.8.0 using corepack:

1. Make sure you have corepack enabled:

```bash
corepack enable
```

2. Activate pnpm version 10.8.0:

```bash
corepack prepare pnpm@10.8.0 --activate
```

3. Verify the installation:

```bash
pnpm --version
```

The output should be `10.8.0`.
