import { DomainError, type ApiErrorIssueDto } from "@m0n0lab/investlab-core";
import type { ZodError } from "zod";
import type { $ZodError } from "zod/v4/core";

export class RequestValidationError extends DomainError<"VALIDATION_ERROR"> {
    readonly code = "VALIDATION_ERROR";
    readonly issues: readonly ApiErrorIssueDto[];

    constructor(issues: readonly ApiErrorIssueDto[]) {
        super("Request validation failed");
        this.name = "RequestValidationError";
        this.issues = issues;
    }

    static fromZod(error: ZodError | $ZodError): RequestValidationError {
        return new RequestValidationError(
            error.issues.map((issue) => ({
                path: issue.path.map(String).join("."),
                message: issue.message,
            })),
        );
    }
}
