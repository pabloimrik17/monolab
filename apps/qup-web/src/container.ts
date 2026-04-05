import { Container } from "inversify";
import { webModule } from "./web.module.ts";

const container = new Container();
container.load(webModule);

export { container };
