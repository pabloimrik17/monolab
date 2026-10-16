// @ts-check
import eslint from "@eslint/js";
import { createConfig as boundariesConfig } from "eslint-plugin-boundaries/config";
import regexpPlugin from "eslint-plugin-regexp";
import globals from "globals";
import tseslint from "typescript-eslint";

// InvestLab layer table inside the module and platform packages (openspec change investlab-modular-packages,
// design §4), checked on the resolved file. Package-root files share the `src` element and differ by file category.
const investlabLayerBoundaries = (() => {
    const platform = "packages/investlab-platform/src";
    const mod = "packages/investlab-*/src";
    const sides = ["server", "client"] as const;
    const layer = (type: string, pattern: string) => ({
        type,
        pattern,
        partialMatch: false,
        capture: ["pkg"],
    });
    const own = (type: string) => ({
        element: { type, captured: { pkg: "{{ from.element.captured.pkg }}" } },
    });
    const rootFile = (category: string) => ({ ...own("root"), file: { categories: category } });
    const from = (type: string, category?: string) => ({
        element: { type },
        ...(category && { file: { categories: category } }),
    });
    return boundariesConfig({
        files: ["packages/investlab-{portfolio,quotes,platform}/src/**/*.ts"],
        settings: {
            "boundaries/root-path": import.meta.dirname,
            "boundaries/legacy-templates": false,
            // workspace packages resolve to dist/; the specifier rules below cover them
            "boundaries/flag-as-external": { customSourcePatterns: ["@m0n0lab/*"] },
            "boundaries/elements": [
                { type: "platform-shared", pattern: `${platform}/shared`, partialMatch: false },
                ...sides.map((side) => ({
                    type: `platform-${side}`,
                    pattern: `${platform}/${side}`,
                    partialMatch: false,
                })),
                { type: "platform-root", pattern: platform, partialMatch: false },
                ...sides.flatMap((side) => [
                    layer(`application-${side}`, `${mod}/application/${side}`),
                    layer(`data-${side}`, `${mod}/data/${side}`),
                ]),
                layer("contracts", `${mod}/data/contracts`),
                layer("domain", `${mod}/domain`),
                layer("root", mod),
            ],
            "boundaries/files": [
                {
                    category: "side-test",
                    pattern: "**/application/*/{given,*.integration,vitest-*}.ts",
                },
                { category: "entry", pattern: "packages/*/src/index.ts" },
                ...sides.flatMap((side) => [
                    { category: `entry-${side}`, pattern: `packages/*/src/${side}.ts` },
                    { category: `module-${side}`, pattern: `packages/*/src/module.${side}.ts` },
                ]),
            ],
        },
        rules: {
            "boundaries/no-unknown-files": "error",
            "boundaries/dependencies": [
                "error",
                {
                    default: "disallow",
                    checkInternals: true,
                    message:
                        "{{from.element.types}} {{from.file.categories}} may not import {{to.element.types}} {{to.file.categories}} (InvestLab layer table)",
                    policies: [
                        { allow: { to: { module: { origin: ["external", "core"] } } } },
                        { from: from("domain"), allow: { to: own("domain") } },
                        {
                            from: from("contracts"),
                            allow: { to: [own("domain"), own("contracts")] },
                        },
                        {
                            from: from("root", "entry"),
                            allow: { to: [own("domain"), own("contracts")] },
                        },
                        {
                            from: from("platform-shared"),
                            allow: { to: { element: { type: "platform-shared" } } },
                        },
                        ...sides.flatMap((side) => [
                            {
                                from: from(`application-${side}`),
                                allow: { to: [own("domain"), own(`application-${side}`)] },
                            },
                            {
                                from: from(`application-${side}`, "side-test"),
                                allow: { to: [rootFile(`module-${side}`), own("contracts")] },
                            },
                            {
                                from: from(`data-${side}`),
                                allow: {
                                    to: [own("domain"), own("contracts"), own(`data-${side}`)],
                                },
                            },
                            {
                                from: from("root", `module-${side}`),
                                allow: {
                                    to: [
                                        own("domain"),
                                        own(`application-${side}`),
                                        own(`data-${side}`),
                                    ],
                                },
                            },
                            {
                                from: from("root", `entry-${side}`),
                                allow: {
                                    to: [
                                        own("domain"),
                                        own(`application-${side}`),
                                        rootFile(`module-${side}`),
                                    ],
                                },
                            },
                            {
                                from: [
                                    from(`platform-${side}`),
                                    from("platform-root", `entry-${side}`),
                                ],
                                allow: {
                                    to: {
                                        element: {
                                            types: {
                                                anyOf: [`platform-${side}`, "platform-shared"],
                                            },
                                        },
                                    },
                                },
                            },
                        ]),
                    ],
                },
            ],
        },
    });
})();

// InvestLab rules on package specifiers (workspace packages and banned libraries), matched on the raw specifier.
// Flat config replaces a rule's options per file, so each file group carries its whole list and groups never overlap.
const investlabLayerRules = (() => {
    type Ban = { regex: string; message: string };
    const ban = (regex: string, message: string): Ban => ({ regex, message });
    const group = (
        files: string[],
        bans: Ban[],
        ignores: string[] = [],
    ): tseslint.ConfigWithExtends => ({
        files,
        ignores,
        rules: { "no-restricted-imports": ["error", { patterns: bans }] },
    });
    const opposite = { server: "client", client: "server" } as const;
    // by package name, own package included: the boundaries plugin sees workspace imports as external
    const otherSide = (side: "server" | "client") =>
        ban(
            `^@m0n0lab/investlab-[a-z-]+/${opposite[side]}(/|$)`,
            `${side} code never imports a ./${opposite[side]} entry`,
        );
    const anySide = ban(
        "^@m0n0lab/investlab-[a-z-]+/(server|client)(/|$)",
        "side-neutral code never imports a ./server or ./client entry",
    );
    const infra = ban(
        "^(pg|drizzle-orm|ioredis|msw|varlock)(/|$)",
        "domain and application depend on ports; infrastructure lives in data/",
    );
    const platformOrDb = ban(
        "^@m0n0lab/investlab-(platform|database)(/|$)",
        "only data/<side>, module.<side>.ts and side tests import the platform or the database",
    );
    const database = ban(
        "^@m0n0lab/investlab-database(/|$)",
        "only server code imports the database package",
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
                    [independent, infra, platformOrDb, otherSide(side)],
                    tests,
                ),
                group(tests, [
                    independent,
                    ban(
                        "^(drizzle-orm|varlock)(/|$)",
                        "use-case tests use the module container, raw pg/ioredis and a constant Config",
                    ),
                    otherSide(side),
                    ...clientDb,
                ]),
                group(
                    [`${src}/data/${side}/**`, `${src}/module.${side}.ts`],
                    [independent, otherSide(side), ...clientDb],
                ),
                group([`${src}/${side}.ts`], [independent, platformOrDb, otherSide(side)]),
            ];
        });
        return [
            group([`${src}/domain/**`], [independent, infra, platformOrDb, anySide]),
            group(
                [`${src}/data/contracts/**`, `${src}/index.ts`],
                [independent, platformOrDb, anySide],
            ),
            ...sides,
        ];
    });
    const notModules = ban(
        "^@m0n0lab/investlab-(database|portfolio|quotes)(/|$)",
        "the platform imports only @m0n0lab/investlab-core",
    );
    return [
        group(["packages/investlab-core/src/**", "packages/investlab-database/src/**"], [ours]),
        ...(["server", "client"] as const).map((side) =>
            group(
                [
                    `packages/investlab-platform/src/${side}.ts`,
                    `packages/investlab-platform/src/${side}/**`,
                ],
                [notModules, otherSide(side)],
            ),
        ),
        group(["packages/investlab-platform/src/shared/**"], [notModules, anySide]),
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
    investlabLayerBoundaries,
    ...investlabLayerRules,
);
