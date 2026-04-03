export interface EventBus {
    emit<T>(event: string, payload: T): void;
    on<T>(event: string, handler: (payload: T) => void): () => void;
}
