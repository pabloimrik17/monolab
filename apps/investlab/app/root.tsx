import { Link, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
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
                </nav>
                {children}
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}

export default function Root() {
    return <Outlet />;
}
