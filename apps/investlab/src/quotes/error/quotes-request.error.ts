export class QuotesRequestError extends Error {
    constructor(message: string, cause?: unknown) {
        super(message, { cause });
        this.name = "QuotesRequestError";
    }
}
