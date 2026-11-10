import { act, type ComponentType, type FC } from "react";
import {
    createMemoryRouter,
    RouterProvider,
    useActionData,
    useLoaderData,
    useMatches,
    useParams,
    useRouteError,
    type ActionFunction,
    type DataRouter,
    type LoaderFunction,
    type RouterState,
} from "react-router";
import { render, type RenderResult } from "vitest-browser-react/pure";
import { getContainer } from "#di/container.server";
import Root, { ErrorBoundary } from "#root";
import { PLATFORM, type ClientConfig } from "@m0n0lab/investlab-platform/client";
import type { Container, ServiceIdentifier } from "inversify";
import type { Locator } from "vitest/browser";

/** Stands in for `SsrEnvConfig`; the guards make sure no URL is ever dialled. */
const TEST_CONFIG: ClientConfig = {
    api: { baseUrl: "http://boundary.invalid", token: "guarded" },
};

type Execute<T> = T extends { execute: (...args: infer A) => infer R }
    ? { args: A; result: R }
    : never;
type ExecuteArgs<T> = Execute<T>["args"];
type ExecuteResult<T> = Execute<T>["result"];

export interface FakeUseCase<T> {
    readonly calls: ExecuteArgs<T>[];
}

class RecordingUseCase<T> implements FakeUseCase<T> {
    readonly calls: ExecuteArgs<T>[] = [];

    constructor(private readonly answer: () => ExecuteResult<T>) {}

    execute(...args: ExecuteArgs<T>): ExecuteResult<T> {
        this.calls.push(args);
        return this.answer();
    }
}

/** A platform port nothing may reach: first use throws, and `onBreach` keeps it from staying hidden in an error boundary. */
function boundaryGuard<T>(port: string, onBreach: (error: Error) => void): T {
    return new Proxy(
        {},
        {
            get(_target, property) {
                // Inversify and the test runner probe symbols and `then`; a port's API is a string key.
                if (typeof property === "symbol" || property === "then") {
                    return undefined;
                }
                const error = new Error(`system boundary reached: ${port}`);
                onBreach(error);
                throw error;
            },
        },
    ) as T;
}

function isAtRest({ initialized, navigation, revalidation, fetchers }: RouterState): boolean {
    return (
        initialized &&
        navigation.state === "idle" &&
        revalidation === "idle" &&
        [...fetchers.values()].every((fetcher) => fetcher.state === "idle")
    );
}

function untilAtRest(router: DataRouter): Promise<void> {
    return new Promise((resolve) => {
        if (isAtRest(router.state)) {
            resolve();
            return;
        }
        const unsubscribe = router.subscribe((state) => {
            if (isAtRest(state)) {
                unsubscribe();
                resolve();
            }
        });
    });
}

/** Resolves after `work`, once React has rendered everything scheduled meanwhile, effects' updates included. */
async function drainingReact(work: () => Promise<void>): Promise<void> {
    const environment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    environment.IS_REACT_ACT_ENVIRONMENT = true;
    try {
        await act(work);
    } finally {
        environment.IS_REACT_ACT_ENVIRONMENT = false;
    }
}

interface RouteProps {
    readonly loaderData: unknown;
    readonly actionData: unknown;
    readonly params: unknown;
    readonly matches: unknown;
}

/** A route file's exports, as `import * as route from "#routes/x"` gives them. */
export interface RouteModule {
    loader?: LoaderFunction;
    action?: ActionFunction;
    default: FC<never>;
}

interface RouteElementProps {
    component: ComponentType<RouteProps>;
}

/** Gives a route component the props the framework's generated `Route.ComponentProps` carries, from public hooks. */
const RouteElement: FC<RouteElementProps> = ({ component }) => {
    const Component = component;
    return (
        <Component
            loaderData={useLoaderData()}
            actionData={useActionData()}
            params={useParams()}
            matches={useMatches()}
        />
    );
};

/** The root's `ErrorBoundary` takes the thrown value as a prop; the framework supplies it from `useRouteError`. */
const RootErrorBoundary: FC = () => {
    return (
        <ErrorBoundary
            error={useRouteError()}
            params={useParams()}
        />
    );
};

export interface OpenOptions<H> {
    readonly url: string;
    /** Runs before the first render, so the first load already sees what it arranges. Synchronous: nothing awaits it. */
    readonly setup: (page: H) => undefined;
}

interface Started {
    readonly container: Container;
    readonly breaches: Error[];
}

/**
 * A real route file mounted in Chromium under the app's real root, on a memory router, against the
 * real composition root. Use cases the test arranges through `fake()` answer in its place; the
 * platform ports behind them are guarded, so an unarranged use case fails the test. The only test
 * code that knows react-router, inversify or vitest-browser-react.
 */
export class WebHarness implements AsyncDisposable {
    private readonly container: Container;
    private readonly breaches: Error[];
    private screen: RenderResult | undefined;
    private router: DataRouter | undefined;
    private closed = false;

    constructor({ container, breaches }: Started) {
        this.container = container;
        this.breaches = breaches;
    }

    /** The page open and settled. Named apart from a page's `launch` because TypeScript checks a static override's signature. */
    protected static async open<H extends WebHarness>(
        this: new (started: Started) => H,
        route: RouteModule,
        { url, setup }: OpenOptions<H>,
    ): Promise<H> {
        const breaches: Error[] = [];
        const breach = (error: Error) => breaches.push(error);

        const container = getContainer();
        container.snapshot();
        container.rebind(PLATFORM.Config).toConstantValue(TEST_CONFIG);
        container
            .rebind(PLATFORM.HttpClient)
            .toConstantValue(boundaryGuard("PLATFORM.HttpClient", breach));
        container
            .rebind(PLATFORM.InvestlabApiClient)
            .toConstantValue(boundaryGuard("PLATFORM.InvestlabApiClient", breach));

        const page = new this({ container, breaches });
        try {
            setup(page);
            await page.mount(route, url);
        } catch (error) {
            await page.close();
            throw error;
        }
        return page;
    }

    /** Idempotent; `await using` calls it at scope end. */
    async close(): Promise<void> {
        if (this.closed) {
            return;
        }
        this.closed = true;
        this.router?.dispose();
        await this.screen?.unmount();
        this.container.restore();
    }

    [Symbol.asyncDispose](): Promise<void> {
        return this.close();
    }

    protected get view(): Locator {
        if (!this.screen) {
            throw new Error("the page is not open yet");
        }
        return this.screen.locator;
    }

    protected fake<T>(token: ServiceIdentifier<T>, result: ExecuteResult<T>): FakeUseCase<T> {
        const fake = new RecordingUseCase<T>(() => result);
        this.container.rebind(token).toConstantValue(fake as unknown as T);
        return fake;
    }

    /** Runs a user action, then waits for the router to rest and its result to be on screen, so reads need no retry. */
    protected async interact(action: () => Promise<unknown>): Promise<void> {
        await action();
        const { router } = this;
        if (!router) {
            throw new Error("the router never rendered");
        }
        // Reads the router, not `useNavigation`: `act` holds renders until it ends, so a hook would never report idle inside it.
        await drainingReact(() => untilAtRest(router));
        const [breach] = this.breaches.splice(0);
        if (breach) {
            throw breach;
        }
    }

    /** Answers any `confirm()` the action raises with `answer`: true accepts it, false cancels it. */
    protected async answeringConfirm(
        answer: boolean,
        action: () => Promise<unknown>,
    ): Promise<void> {
        const original = window.confirm;
        window.confirm = () => answer;
        try {
            await action();
        } finally {
            window.confirm = original;
        }
    }

    protected visible(locator: Locator): Element[] {
        return locator.elements().filter((element) => element.checkVisibility());
    }

    private mount(route: RouteModule, url: string): Promise<void> {
        const router = createMemoryRouter(
            [
                {
                    Component: Root,
                    ErrorBoundary: RootErrorBoundary,
                    HydrateFallback: () => null,
                    children: [
                        {
                            path: new URL(url, "http://harness.invalid").pathname,
                            loader: route.loader,
                            action: route.action,
                            element: (
                                <RouteElement
                                    component={route.default as ComponentType<RouteProps>}
                                />
                            ),
                        },
                    ],
                },
            ],
            { initialEntries: [url] },
        );
        this.router = router;
        return this.interact(async () => {
            this.screen = await render(<RouterProvider router={router} />);
        });
    }
}
