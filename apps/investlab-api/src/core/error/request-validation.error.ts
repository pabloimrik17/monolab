import { DomainError, type ApiErrorIssueDto } from "@m0n0lab/investlab-core";

interface ZodIssues {
    readonly issues: readonly { readonly path: readonly PropertyKey[]; readonly message: string }[];
}

export class RequestValidationError extends DomainError<"VALIDATION_ERROR"> {
    readonly code = "VALIDATION_ERROR";
    readonly issues: readonly ApiErrorIssueDto[];

    constructor(issues: readonly ApiErrorIssueDto[]) {
        super("Request validation failed");
        this.name = "RequestValidationError";
        this.issues = issues;
    }

    static fromZod(error: ZodIssues): RequestValidationError {
        return new RequestValidationError(
            error.issues.map((issue) => ({
                path: issue.path.map(String).join("."),
                message: issue.message,
            })),
        );
    }
}
