// @ts-check
import eslint from "@eslint/js";
import { createConfig as boundariesConfig } from "eslint-plugin-boundaries/config";
import regexpPlugin from "eslint-plugin-regexp";
import globals from "globals";
import tseslint from "typescript-eslint";

// The boundaries plugin resolves imports through `import/resolver`; the TypeScript resolver reads each project's own
// tsconfig `paths`. Absolute paths, because every project runs ESLint from its own directory. Added after
// `createConfig`, which accepts only boundaries settings.
const withTypescriptResolver = (
    config: ReturnType<typeof boundariesConfig>,
    projectRoots: readonly string[],
): ReturnType<typeof boundariesConfig> => ({
    ...config,
    settings: {
        ...config.settings,
        "import/resolver": {
            typescript: {
                project: projectRoots.map((root) => `${import.meta.dirname}/${root}/tsconfig.json`),
                noWarnOnMultipleProjects: true,
            },
        },
    },
});

// `no-restricted-imports` matches the raw specifier. Flat config replaces a rule's options per file, so each file
// group carries its whole list.
type Ban = { regex: string; message: string };
const ban = (regex: string, message: string): Ban => ({ regex, message });
const importBans = (
    files: string[],
    bans: Ban[],
    ignores: string[] = [],
): tseslint.ConfigWithExtends => ({
    files,
    ignores,
    rules: { "no-restricted-imports": ["error", { patterns: bans }] },
});

// Every InvestLab project is on the layout; the database package is exempt from it.
const investlabLayout: CleanArchitectureOptions = {
    product: "investlab",
    modules: ["portfolio", "quotes"],
    migrated: [
        "packages/investlab-core",
        "packages/investlab-platform",
        "packages/investlab-portfolio",
        "packages/investlab-quotes",
        "apps/investlab-api",
        "apps/investlab",
    ],
};

// Clean Architecture layout of one product (openspec change clean-architecture-layout, design §13).
type CleanArchitectureOptions = {
    /** Prefix of the product's projects: `packages/<product>-*`, `apps/<product>` and `apps/<product>-*`. */
    product: string;
    /** Module packages (`packages/<product>-<module>`); they also name the app module folders. */
    modules: readonly string[];
    /** Roots of the projects already on the layout (`packages/investlab-core`); only these are checked. */
    migrated: readonly string[];
};

const cleanArchitectureLint = (options: CleanArchitectureOptions) => {
    const projects = options.migrated.map((root) => layoutProject(root, options));
    if (projects.length === 0) {
        return [];
    }
    const boundaries = boundariesConfig({
        files: projects.map(({ root }) => `${root}/src/**/*.{ts,tsx}`),
        settings: {
            "boundaries/root-path": import.meta.dirname,
            "boundaries/legacy-templates": false,
            "boundaries/flag-as-external": { customSourcePatterns: ["@m0n0lab/*"] },
            // Element descriptors match folders only, so a layout element (folder plus suffix) is a file category.
            // With no folder element, a file in no category is unknown and `no-unknown-files` reports it.
            "boundaries/elements": [],
            "boundaries/files": projects.flatMap((project) =>
                layoutElements[project.kind](options.modules).flatMap((element) =>
                    fileCategories(project, element),
                ),
            ),
        },
        rules: {
            "boundaries/no-unknown-files": "error",
            "boundaries/dependencies": [
                "error",
                {
                    default: "disallow",
                    checkInternals: true,
                    message:
                        "{{from.file.categories}} may not import {{to.file.categories}} (clean architecture layout)",
                    policies: projects.flatMap((project) =>
                        layoutPolicies[project.kind].map((policy) => scopedPolicy(project, policy)),
                    ),
                },
            ],
        },
    });
    return [
        withTypescriptResolver(
            boundaries,
            projects.map(({ root }) => root),
        ),
        ...projects.flatMap((project) => layoutImportBans[project.kind](project, options)),
    ];
};

type LayoutKind = "module" | "core" | "platform" | "ui-app" | "api-app";
type LayoutProject = { root: string; kind: LayoutKind };

const layoutProject = (
    root: string,
    { product, modules }: CleanArchitectureOptions,
): LayoutProject => {
    const packageKinds = new Map<string, LayoutKind>([
        [`packages/${product}-core`, "core"],
        [`packages/${product}-platform`, "platform"],
        ...modules.map((module): [string, LayoutKind] => [
            `packages/${product}-${module}`,
            "module",
        ]),
    ]);
    const kind = packageKinds.get(root) ?? appKind(root, product);
    if (!kind) {
        throw new Error(`cleanArchitectureLint: ${root} is not a ${product} project in scope`);
    }
    return { root, kind };
};

const appKind = (root: string, product: string): LayoutKind | undefined => {
    if (root !== `apps/${product}` && !root.startsWith(`apps/${product}-`)) {
        return undefined;
    }
    return root.endsWith("-api") ? "api-app" : "ui-app";
};

const sides = ["server", "client"] as const;
const testSuffixes = [".test", ".legacy.test", ".integration", ".integration-platform", ".test-d"];
const domainKinds = [
    "model",
    "value-object",
    "read-model",
    "event",
    "error",
    "repository",
    "query",
];
const applicationKinds = ["use-case", "port"];
const sideDataKinds = ["repository", "query", "datasource", "mapper"];
const sharedDataKinds = ["dto", "mapper"];
const uiAppKinds = ["page", "component", "hook", "view-model", "form", "mapper", "error"];
const apiAppKinds = ["route", "middleware", "mapper", "error"];
const diModules = { server: "di/server.module", client: "di/{client,browser}.module" };
// framework entry files at an app's `src/` root: React Router, Hono, SolidStart and SvelteKit
const appEntryFiles = [
    "index",
    "app",
    "app.d",
    "root",
    "routes",
    "entry",
    "entry-client",
    "entry-server",
    "hooks",
    "middleware",
];
const catchAllFolder = "!(util|utils|lib|helpers|common)";

// Files at `src/<path>` plus optional suffixes; package categories start with the side (`server/data/repository`).
type LayoutElement = { category: string; path: string };

const kindFolders = (category: string, folder: string, kinds: readonly string[]): LayoutElement[] =>
    kinds.map((kind) => ({ category: `${category}/${kind}`, path: `${folder}/${kind}/*.${kind}` }));

// `data/<side>/infra/<medium>/<name>.<role>.ts` and `<side folder>/tokens.ts`
const dataFolders = (side: string, kinds: readonly string[]): LayoutElement[] => [
    ...kindFolders(`${side}/data`, `data/${side}`, kinds),
    { category: `${side}/data/infra`, path: `data/${side}/infra/*/*.*` },
    { category: `${side}/data/tokens`, path: `data/${side}/tokens` },
];

const sharedLayerElements: LayoutElement[] = [
    ...kindFolders("shared/domain", "domain", domainKinds),
    ...dataFolders("shared", sharedDataKinds),
    { category: "shared/entry", path: "index" },
];

const moduleElements: LayoutElement[] = [
    ...sharedLayerElements,
    { category: "shared/testing/builder", path: "testing/shared/builder/*.builder" },
    { category: "shared/testing/entry", path: "testing" },
    ...sides.flatMap((side) => [
        ...kindFolders(`${side}/application`, `application/${side}`, applicationKinds),
        { category: `${side}/application/tokens`, path: `application/${side}/tokens` },
        ...dataFolders(side, sideDataKinds),
        { category: `${side}/di`, path: diModules[side] },
        { category: `${side}/testing`, path: `testing/${side}/{given,vitest-*}` },
        { category: `${side}/entry`, path: side },
    ]),
];

const platformElements: LayoutElement[] = [
    ...["shared", ...sides].flatMap((side) => [
        { category: `${side}/medium`, path: `${side}/${catchAllFolder}/*` },
        { category: `${side}/tokens`, path: `${side}/tokens` },
    ]),
    ...sides.map((side) => ({ category: `${side}/di`, path: diModules[side] })),
    { category: "shared/entry", path: "index" },
    ...sides.map((side) => ({ category: `${side}/entry`, path: side })),
];

const appElements = (kinds: readonly string[], modules: readonly string[]): LayoutElement[] => [
    ...modules.flatMap((module) => [
        ...kinds.map((kind) => ({
            category: `module/${kind}`,
            path: `${module}/${kind}/*.${kind}`,
        })),
        { category: "module/di", path: `${module}/di/${module}.module` },
    ]),
    ...kindFolders("core", "core", [...kinds, "harness"]),
    { category: "di", path: "di/container" },
    { category: "routes", path: "routes/**/*" },
    { category: "entry", path: `{${appEntryFiles.join(",")}}` },
];

const layoutElements: Record<LayoutKind, (modules: readonly string[]) => LayoutElement[]> = {
    core: () => sharedLayerElements,
    module: () => moduleElements,
    platform: () => platformElements,
    "ui-app": (modules) => appElements(uiAppKinds, modules),
    "api-app": (modules) => appElements(apiAppKinds, modules),
};

// The element's own category, plus `test`, `harness` and `framework/<side>` on the same folder and suffix, so these
// file categories never make an off-layout file known. Harnesses and `.server`/`.client` suffixes exist in apps only.
const fileCategories = ({ root, kind }: LayoutProject, { category, path }: LayoutElement) => {
    const file = `${root}/src/${path}`;
    return kind.endsWith("-app")
        ? appFileCategories(file, category)
        : packageFileCategories(file, category);
};

const extension = ".{ts,tsx}";
const optional = (suffixes: readonly string[]) => `{,${suffixes.join(",")}}`;
const oneOf = (suffixes: readonly string[]) => `{${suffixes.join(",")}}`;

const packageFileCategories = (file: string, category: string) => [
    { category, pattern: `${file}${optional(testSuffixes)}${extension}` },
    { category: "test", pattern: `${file}${oneOf(testSuffixes)}${extension}` },
];

const appFileCategories = (file: string, category: string) => {
    const anySide = `${file}${optional([".server", ".client"])}`;
    return [
        { category, pattern: `${anySide}${optional([...testSuffixes, ".harness"])}${extension}` },
        { category: "test", pattern: `${anySide}${oneOf(testSuffixes)}${extension}` },
        { category: "harness", pattern: `${anySide}.harness${extension}` },
        ...sides.map((side) => ({
            category: `framework/${side}`,
            pattern: `${file}.${side}${optional(testSuffixes)}${extension}`,
        })),
    ];
};

// A file category pattern, or every pattern in `allOf` for files in several categories (`test` and a side).
type Categories = string | { allOf: string[]; noneOf?: string[] };
type LayoutPolicy =
    | { from: Categories; allow: string[] }
    | { from: Categories; disallow: string[]; message: string };

const allow = (from: Categories, to: string[]): LayoutPolicy => ({ from, allow: to });
const disallow = (from: Categories, to: string[], message: string): LayoutPolicy => ({
    from,
    disallow: to,
    message,
});

// The last matching policy wins, so these disallows override any allow above them.
const sideRules = [
    disallow("server/**", ["client/**"], "server code never imports client code"),
    disallow("client/**", ["server/**"], "client code never imports server code"),
    disallow("shared/**", ["{server,client}/**"], "shared code imports only shared code"),
];

// Dependency direction: domain ← application ← data, and `di/` composes its side.
const sharedLayerPolicies = [
    allow("shared/domain/**", ["shared/domain/**"]),
    allow("shared/data/**", ["shared/domain/**", "shared/data/**"]),
    allow("shared/entry", ["shared/domain/**", "shared/data/**"]),
];

const modulePolicies = [
    ...sharedLayerPolicies,
    allow("shared/testing/builder", ["shared/domain/**", "shared/testing/builder"]),
    allow("shared/testing/entry", ["shared/testing/builder"]),
    allow({ allOf: ["test", "shared/**"] }, ["shared/testing/builder"]),
    ...sides.flatMap((side) => [
        allow(`${side}/application/**`, ["shared/domain/**", `${side}/application/**`]),
        allow(`${side}/data/**`, [
            "shared/{domain,data}/**",
            `${side}/application/port`,
            `${side}/data/**`,
        ]),
        allow(`${side}/di`, ["shared/{domain,data}/**", `${side}/{application,data}/**`]),
        allow(`${side}/testing`, [
            "shared/{domain,data}/**",
            "shared/testing/builder",
            `${side}/{application,data}/**`,
            `${side}/{di,testing}`,
        ]),
        allow(`${side}/entry`, ["shared/domain/**", `${side}/application/**`, `${side}/di`]),
        allow({ allOf: ["test", `${side}/**`] }, [
            "shared/testing/builder",
            `${side}/{di,testing}`,
        ]),
    ]),
    ...sideRules,
    // a test imports the repository it tests
    disallow(
        { allOf: ["*/data/repository"], noneOf: ["test"] },
        ["*/data/repository"],
        "a repository never imports another repository; a use case coordinates aggregates",
    ),
];

const platformPolicies = [
    allow("shared/{medium,tokens,entry}", ["shared/{medium,tokens}"]),
    ...sides.flatMap((side) => [
        allow(`${side}/{medium,tokens,di}`, [`${side}/{medium,tokens}`, "shared/{medium,tokens}"]),
        allow(`${side}/entry`, [`${side}/{medium,tokens,di}`, "shared/{medium,tokens}"]),
        allow({ allOf: ["test", `${side}/**`] }, [`${side}/di`]),
    ]),
    ...sideRules,
];

const appPolicies = [
    allow("module/**", ["module/**", "core/**", "di"]),
    allow("core/**", ["core/**", "di"]),
    allow("di", ["module/**", "core/**", "di"]),
    allow("routes", ["module/**", "core/**", "di"]),
    // a route test imports its route; routes never import each other
    allow({ allOf: ["test", "routes"] }, ["routes"]),
    allow("entry", ["**"]),
    // a harness boots the app entry it drives
    allow("{harness,core/harness}", ["entry", "module/**", "core/**", "di"]),
    disallow("core/**", ["module/**"], "core/ never imports a module"),
    disallow("framework/client", ["framework/server"], ".client files never import .server files"),
    disallow("framework/server", ["framework/client"], ".server files never import .client files"),
];

const layoutPolicies: Record<LayoutKind, LayoutPolicy[]> = {
    core: [...sharedLayerPolicies, ...sideRules],
    module: modulePolicies,
    platform: platformPolicies,
    "ui-app": appPolicies,
    "api-app": appPolicies,
};

// Both ends of every policy stay inside the project; a local import into another project matches no policy.
const scopedPolicy = ({ root }: LayoutProject, policy: LayoutPolicy) => {
    const inProject = (categories: Categories | string[]) => ({
        file: { path: `${root}/**`, categories },
    });
    return "allow" in policy
        ? { from: inProject(policy.from), allow: { to: inProject(policy.allow) } }
        : {
              from: inProject(policy.from),
              disallow: { to: inProject(policy.disallow) },
              message: policy.message,
          };
};

// The InvestLab package-specifier rules on the new layout. The folder bans join every group, because each file keeps
// the options of the last group that matches it.
const parentFolder = ban(
    "(^|/)\\.\\.(/|$)",
    "import another folder through its # alias, never through ../",
);
// `./+types/` holds React Router's generated route types.
const subFolder = ban(
    "^\\./(?!\\+types/)[^/]+/",
    "import a subfolder through its # alias; ./ is for the same folder only",
);
const layoutGroup = (files: string[], bans: Ban[], ignores: string[] = []) =>
    importBans(files, [...bans, parentFolder, subFolder], ignores);

const productBans = (product: string) => {
    const ours = `^@m0n0lab/${product}-`;
    const opposite = { server: "client", client: "server" } as const;
    return {
        packages: (names: readonly string[], message: string) =>
            ban(`${ours}(${names.join("|")})(/|$)`, message),
        otherSide: (side: (typeof sides)[number]) =>
            ban(
                `${ours}[a-z-]+/${opposite[side]}(/|$)`,
                `${side} code never imports a ./${opposite[side]} entry`,
            ),
        anySide: ban(
            `${ours}[a-z-]+/(server|client)(/|$)`,
            "side-neutral code never imports a ./server or ./client entry",
        ),
        infra: ban(
            "^(pg|drizzle-orm|ioredis|msw|varlock)(/|$)",
            "domain, application and shared code depend on ports; infrastructure lives in data/<side>",
        ),
        platformOrDb: ban(
            `${ours}(platform|database)(/|$)`,
            "only data/<side>, di/ and side test support import the platform or the database",
        ),
        database: ban(`${ours}database(/|$)`, "only server code imports the database package"),
        serverEntry: ban(
            `${ours}[a-z-]+/server$|${ours}database(/|$)`,
            "the web imports `.` and `./client` entries only",
        ),
        clientEntry: ban(
            `${ours}[a-z-]+/client$`,
            "the API imports `.` and `./server` entries only",
        ),
        clientEntryOutsideRoutesOrDi: ban(
            `${ours}[a-z-]+/client$`,
            "import `./client` entries from `src/routes/` and `src/di/` only",
        ),
    };
};

type LayoutBans = (
    project: LayoutProject,
    options: CleanArchitectureOptions,
) => tseslint.ConfigWithExtends[];

const coreBans: LayoutBans = ({ root }, { product }) => [
    layoutGroup(
        [`${root}/src/**`],
        [ban(`^@m0n0lab/${product}-`, `the core package imports no other ${product} package`)],
    ),
];

const platformBans: LayoutBans = ({ root }, { product, modules }) => {
    const src = `${root}/src`;
    const bans = productBans(product);
    const notModules = bans.packages(
        ["database", ...modules],
        `the platform imports only @m0n0lab/${product}-core`,
    );
    return [
        layoutGroup([`${src}/shared/**`, `${src}/index.ts`], [notModules, bans.anySide]),
        ...sides.map((side) =>
            layoutGroup(
                [`${src}/${side}/**`, `${src}/${side}.ts`, `${src}/${diModules[side]}.*`],
                [notModules, bans.otherSide(side)],
            ),
        ),
    ];
};

const moduleBans: LayoutBans = ({ root }, { product, modules }) => {
    const src = `${root}/src`;
    const bans = productBans(product);
    const independent = bans.packages(
        modules.filter((other) => root !== `packages/${product}-${other}`),
        "business modules never import each other",
    );
    const sideNeutral = [
        `${src}/domain/**`,
        `${src}/data/shared/**`,
        `${src}/index.ts`,
        `${src}/testing/shared/**`,
        `${src}/testing.ts`,
    ];
    return [
        layoutGroup(sideNeutral, [independent, bans.infra, bans.platformOrDb, bans.anySide]),
        ...sides.flatMap((side) => {
            const clientDb = side === "client" ? [bans.database] : [];
            const tests = [
                `${src}/application/${side}/**/*.integration.ts`,
                `${src}/testing/${side}/**`,
            ];
            const testLibraries = ban(
                "^(drizzle-orm|varlock)(/|$)",
                "use-case tests use the module container, raw pg/ioredis and a constant Config",
            );
            return [
                layoutGroup(
                    [`${src}/application/${side}/**`],
                    [independent, bans.infra, bans.platformOrDb, bans.otherSide(side)],
                    tests,
                ),
                layoutGroup(tests, [independent, testLibraries, bans.otherSide(side), ...clientDb]),
                layoutGroup(
                    [`${src}/data/${side}/**`, `${src}/${diModules[side]}.*`],
                    [independent, bans.otherSide(side), ...clientDb],
                ),
                layoutGroup(
                    [`${src}/${side}.ts`],
                    [independent, bans.platformOrDb, bans.otherSide(side)],
                ),
            ];
        }),
    ];
};

// `./client` entries: the route files and the composition root only
const uiAppBans: LayoutBans = ({ root }, { product }) => {
    const src = `${root}/src`;
    const bans = productBans(product);
    const clientEntryFiles = [`${src}/routes/**`, `${src}/di/**`];
    return [
        layoutGroup(
            [`${src}/**`],
            [bans.serverEntry, bans.clientEntryOutsideRoutesOrDi],
            clientEntryFiles,
        ),
        layoutGroup(clientEntryFiles, [bans.serverEntry]),
    ];
};

const apiAppBans: LayoutBans = ({ root }, { product }) => [
    layoutGroup([`${root}/src/**`], [productBans(product).clientEntry]),
];

const layoutImportBans: Record<LayoutKind, LayoutBans> = {
    core: coreBans,
    module: moduleBans,
    platform: platformBans,
    "ui-app": uiAppBans,
    "api-app": apiAppBans,
};

// InvestLab package-specifier rules outside the layout: the database package is exempt from it, and the apps' tool
// configs sit outside `src/`, so the layout's folder bans do not apply.
const investlabOutsideLayoutBans = (() => {
    const bans = productBans(investlabLayout.product);
    return [
        importBans(
            ["packages/investlab-database/src/**"],
            [
                ban(
                    "^@m0n0lab/investlab-",
                    "the database package imports no other InvestLab package",
                ),
            ],
        ),
        importBans(
            ["apps/investlab/**"],
            [bans.serverEntry, bans.clientEntryOutsideRoutesOrDi],
            ["apps/investlab/src/**"],
        ),
        importBans(["apps/investlab-api/**"], [bans.clientEntry], ["apps/investlab-api/src/**"]),
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
            ecmaVersion: 2025,
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
    ...investlabOutsideLayoutBans,
    ...cleanArchitectureLint(investlabLayout),
);
