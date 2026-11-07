/** The quotes route could not be reached, refused the request, or answered something other than quotes. */
export class QuotesRequestError extends Error {
    constructor(message: string, cause?: unknown) {
        super(message, { cause });
        this.name = "QuotesRequestError";
    }
}
