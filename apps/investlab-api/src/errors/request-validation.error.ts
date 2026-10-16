// fallow-ignore-file unused-class-member -- `code` implements the abstract DomainError contract, read by error mapping through the base type
import { DomainError, type ApiErrorIssueDto } from "@m0n0lab/investlab-core";
import type { ZodError } from "zod";

export class RequestValidationError extends DomainError<"VALIDATION_ERROR"> {
    readonly code = "VALIDATION_ERROR";
    readonly issues: readonly ApiErrorIssueDto[];

    constructor(issues: readonly ApiErrorIssueDto[]) {
        super("Request validation failed");
        this.name = "RequestValidationError";
        this.issues = issues;
    }

    static fromZod(error: ZodError, root = ""): RequestValidationError {
        return new RequestValidationError(
            error.issues.map((issue) => ({
                path: [root, ...issue.path].filter((part) => part !== "").join("."),
                message: issue.message,
            })),
        );
    }
}
