import "./global.css";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";

export default function App() {
    return (
        <Router
            root={(props) => (
                <Suspense fallback={<main role="status">Loading...</main>}>
                    {props.children}
                </Suspense>
            )}
        >
            <FileRoutes />
        </Router>
    );
}
