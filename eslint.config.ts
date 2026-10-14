// @ts-check
import eslint from "@eslint/js";
import regexpPlugin from "eslint-plugin-regexp";
import globals from "globals";
import tseslint from "typescript-eslint";

// InvestLab layer rules (openspec change investlab-modular-packages, design §4), matched on the raw specifier.
// Flat config replaces a rule's options per file, so each file group carries its whole list and groups never overlap.
const investlabLayerRules = (() => {
    type Ban = { regex: string; message: string };
    const ban = (regex: string, message: string): Ban => ({ regex, message });
    const group = (files: string[], bans: Ban[], ignores: string[] = []) => ({
        files,
        ignores,
        rules: { "no-restricted-imports": ["error", { patterns: bans }] as const },
    });
    const opposite = { server: "client", client: "server" } as const;
    const sideOnly = (side: "server" | "client") =>
        ban(
            `(^|/)${opposite[side]}(/|$)`,
            `${side} code never imports ${opposite[side]} code or a ./${opposite[side]} entry`,
        );
    const infra = ban(
        "^(pg|drizzle-orm|ioredis|msw|varlock)(/|$)",
        "domain and application depend on ports; infrastructure lives in data/",
    );
    const platformOrDb = ban(
        "^@m0n0lab/investlab-(platform|database)(/|$)",
        "domain and application never import the platform or the database",
    );
    const database = ban(
        "^@m0n0lab/investlab-database(/|$)",
        "only server code imports the database package",
    );
    const application = ban(
        "(^|/)application/",
        "only module.*.ts and the entries import application/",
    );
    const data = ban("(^|/)data/", "domain and application never import data/");
    const containerModule = ban(
        "(^|/)module\\.(server|client)(\\.ts)?$",
        "only the entries and side tests import module.*.ts",
    );
    const ours = ban("^@m0n0lab/investlab-", "this package imports no other InvestLab package");
    const serverEntry = ban(
        "^@m0n0lab/investlab-[a-z-]+/server$|^@m0n0lab/investlab-database(/|$)",
        "the web imports `.` and `./client` entries only",
    );
    const clientEntry = ban(
        "^@m0n0lab/investlab-[a-z-]+/client$",
        "the API imports `.` and `./server` entries only",
    );
    const testFiles = ["given.ts", "*.integration.ts", "vitest-*.ts"];

    const moduleNames = ["portfolio", "quotes"];
    const modules = moduleNames.flatMap((name) => {
        const src = `packages/investlab-${name}/src`;
        const independent = ban(
            `^@m0n0lab/investlab-(${moduleNames.filter((other) => other !== name).join("|")})(/|$)`,
            "business modules never import each other",
        );
        const sides = (["server", "client"] as const).flatMap((side) => {
            const clientDb = side === "client" ? [database] : [];
            const tests = testFiles.map((file) => `${src}/application/${side}/${file}`);
            return [
                group(
                    [`${src}/application/${side}/**`],
                    [independent, infra, platformOrDb, data, containerModule, sideOnly(side)],
                    tests,
                ),
                group(tests, [
                    independent,
                    ban(
                        "^(drizzle-orm|varlock)(/|$)",
                        "use-case tests use the module container, raw pg/ioredis and a constant Config",
                    ),
                    ban(
                        "(^|/)data/(server|client)/",
                        "use-case tests reach data/ through the module container",
                    ),
                    sideOnly(side),
                    ...clientDb,
                ]),
                group(
                    [`${src}/data/${side}/**`],
                    [independent, application, containerModule, sideOnly(side), ...clientDb],
                ),
                group(
                    [`${src}/module.${side}.ts`, `${src}/${side}.ts`],
                    [independent, sideOnly(side), ...clientDb],
                ),
            ];
        });
        return [
            group(
                [`${src}/domain/**`],
                [independent, infra, platformOrDb, application, data, containerModule],
            ),
            group(
                [`${src}/data/contracts/**`, `${src}/index.ts`],
                [
                    independent,
                    platformOrDb,
                    application,
                    containerModule,
                    sideOnly("server"),
                    sideOnly("client"),
                ],
            ),
            ...sides,
        ];
    });
    const notModules = ban(
        "^@m0n0lab/investlab-(database|portfolio|quotes)(/|$)",
        "the platform imports only @m0n0lab/investlab-core",
    );
    const platform = "packages/investlab-platform/src";
    return [
        group(["packages/investlab-core/src/**", "packages/investlab-database/src/**"], [ours]),
        group([`${platform}/server.ts`, `${platform}/server/**`], [notModules, sideOnly("server")]),
        group([`${platform}/client.ts`, `${platform}/client/**`], [notModules, sideOnly("client")]),
        group([`${platform}/shared/**`], [notModules, sideOnly("server"), sideOnly("client")]),
        ...modules,
        // `./client` entries are server-only web code (SSR): only `.server.ts` files import them
        group(
            ["apps/investlab/**"],
            [
                serverEntry,
                ban(
                    "^@m0n0lab/investlab-[a-z-]+/client$",
                    "import `./client` entries from `.server.ts` files only",
                ),
            ],
            ["apps/investlab/**/*.server.ts", "apps/investlab/**/*.server.test.ts"],
        ),
        group(
            ["apps/investlab/**/*.server.ts", "apps/investlab/**/*.server.test.ts"],
            [serverEntry],
        ),
        group(["apps/investlab-api/**"], [clientEntry]),
    ];
})();

export default tseslint.config(
    {
        ignores: [
            "**/dist/**",
            "**/out-tsc/**",
            "**/node_modules/**",
            "**/coverage/**",
            "**/html/**",
            "**/reports/**",
            "openspec/**",
            ".agent/**",
            ".agents/**",
            ".claude/**",
            ".codex/**",
            ".junie/**",
            ".opencode/**",
            "**/CHANGELOG.md",
            "**/CLAUDE.md",
            "**/AGENTS.md",
            "**/build/**",
            "**/.react-router/**",
            "**/.vinxi/**",
            "**/.output/**",
            "**/.nx/**",
            "**/.svelte-kit/**",
            "**/.vercel/**",
            "**/.expect/**",
        ],
    },
    eslint.configs.recommended,
    tseslint.configs.recommended,
    regexpPlugin.configs.recommended,
    {
        files: ["**/*.cjs", "**/*.mjs", "**/*.config.{js,ts,cjs,mjs}"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    // Type-aware linting (project service; excludes out-of-project config files).
    {
        files: ["**/*.{ts,tsx,mts,cts}"],
        ignores: [
            "**/*.config.{ts,mts,cts}",
            "eslint.config.ts",
            "**/*.test-d.ts",
            "**/*.setup.{ts,mts,cts}",
        ],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/no-unnecessary-type-assertion": "warn",
        },
    },
    // Files not covered by a build tsconfig (JS, configs, tests, setup, type-tests):
    // disable the type-checked project service so they don't trip the parser.
    {
        files: [
            "**/*.{js,cjs,mjs}",
            "**/*.config.{ts,mts,cts}",
            "eslint.config.ts",
            "**/*.test.{ts,tsx,mts,cts}",
            "**/*.spec.{ts,tsx,mts,cts}",
            "**/*.integration.{ts,tsx}",
            "**/*.test-d.ts",
            "**/*.setup.{ts,mts,cts}",
        ],
        extends: [tseslint.configs.disableTypeChecked],
    },
    {
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    enableAutofixRemoval: { imports: true },
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "no-constant-binary-expression": ["error", { checkRelationalComparisons: true }],
            "preserve-caught-error": "warn",
        },
    },
    {
        files: ["**/*.test-d.ts"],
        rules: {
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-empty-object-type": "off",
        },
    },
    ...investlabLayerRules,
);
