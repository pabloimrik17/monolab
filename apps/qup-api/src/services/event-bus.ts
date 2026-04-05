import { EventEmitter } from "node:events";
import { injectable } from "inversify";
import type { EventBus } from "@m0n0lab/qup-domain";

@injectable()
export class InMemoryEventBus implements EventBus {
    private readonly emitter = new EventEmitter();

    constructor() {
        this.emitter.setMaxListeners(0);
    }

    emit<T>(event: string, payload: T): void {
        this.emitter.emit(event, payload);
    }

    on<T>(event: string, handler: (payload: T) => void): () => void {
        const safeHandler = (payload: T) => {
            try {
                handler(payload);
            } catch (e) {
                console.error(`EventBus handler error for "${event}":`, e);
            }
        };
        this.emitter.on(event, safeHandler);
        return () => {
            this.emitter.off(event, safeHandler);
        };
    }
}
