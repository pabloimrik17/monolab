import { injectable } from "inversify";

@injectable()
export class EventSourceService {
    connect(url: string, handlers: Record<string, (data: unknown) => void>): () => void {
        const source = new EventSource(url);
        for (const [event, handler] of Object.entries(handlers)) {
            source.addEventListener(event, (e: MessageEvent) => {
                handler(JSON.parse(e.data as string));
            });
        }
        return () => source.close();
    }
}
