import {
    isRouteErrorResponse,
    Link,
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import type { FC } from "react";
import "./app.css";

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
    return (
        <html lang="en">
            <head>
                <meta charSet="UTF-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                />
                <title>InvestLab</title>
                <Meta />
                <Links />
            </head>
            <body>
                <nav className="top-nav">
                    <Link to="/">Tickers</Link>
                    <Link to="/portfolio">Portfolio</Link>
                    <Link to="/roger">Roger</Link>
                </nav>
                {children}
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
};

const Root: FC = () => {
    return <Outlet />;
};

export default Root;

export const ErrorBoundary: FC<Route.ErrorBoundaryProps> = ({ error }) => {
    if (isRouteErrorResponse(error)) {
        const message =
            typeof error.data === "string" && error.data !== "" ? error.data : error.statusText;
        return (
            <main className="empty-state">
                <h1>{error.status}</h1>
                <p>{message}</p>
            </main>
        );
    }

    return (
        <main className="empty-state">
            <h1>Something went wrong</h1>
            {import.meta.env.DEV && error instanceof Error && <p>{error.message}</p>}
        </main>
    );
};
