// fallow-ignore-file unused-class-member -- `code` implements the abstract DomainError contract, read by error mapping through the base type
import { DomainError } from "@m0n0lab/investlab-domain";
import type { ApiErrorIssueDto } from "@m0n0lab/investlab-data-contracts";
import type { ZodError } from "zod";

export class RequestValidationError extends DomainError {
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
