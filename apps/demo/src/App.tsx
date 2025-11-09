import { isEven } from "@m0n0lab/is-even";
import { isOdd } from "@m0n0lab/is-odd";
import { createSignal } from "solid-js";
import "./App.css";
import solidLogo from "./assets/solid.svg";
import viteLogo from "/vite.svg";

function App() {
    const [count, setCount] = createSignal(0);

    return (
        <>
            <div>
                <a
                    href="https://vite.dev"
                    target="_blank"
                >
                    <img
                        src={viteLogo}
                        class="logo"
                        alt="Vite logo"
                    />
                </a>
                <a
                    href="https://solidjs.com"
                    target="_blank"
                >
                    <img
                        src={solidLogo}
                        class="logo solid"
                        alt="Solid logo"
                    />
                </a>
            </div>
            <h1>Vite + Solid</h1>
            <div class="card">
                <button onClick={() => setCount((count) => count + 1)}>
                    count is {count()}
                </button>
                <p>
                    The current count is {isOdd(count()) ? "odd" : "not odd"}{" "}
                    and {isEven(count()) ? "even" : "not even"}
                </p>
                <p>
                    Edit <code>src/App.tsx</code> and save to test HMR
                </p>
            </div>
            <p class="read-the-docs">
                Click on the Vite and Solid logos to learn more
            </p>
        </>
    );
}

export default App;
