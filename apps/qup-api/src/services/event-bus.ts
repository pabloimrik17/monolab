import { EventEmitter } from "node:events";
import { injectable } from "inversify";
import type { EventBus } from "@m0n0lab/qup-domain";

@injectable()
export class InMemoryEventBus implements EventBus {
    private readonly emitter = new EventEmitter();

    emit<T>(event: string, payload: T): void {
        this.emitter.emit(event, payload);
    }

    on<T>(event: string, handler: (payload: T) => void): () => void {
        this.emitter.on(event, handler);
        return () => {
            this.emitter.off(event, handler);
        };
    }
}
