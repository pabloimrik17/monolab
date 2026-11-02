import { z } from "zod";

// Wire discriminant of every error body (ADR 0005): domain codes plus the API-level ones.
export const apiErrorCodeSchema = z.enum([
    "PERSISTENCE_ERROR",
    "VALIDATION_ERROR",
    "INSTRUMENT_NOT_FOUND",
    "INSTRUMENT_IN_USE",
    "INSTRUMENT_ALREADY_EXISTS",
    "PORTFOLIO_ITEM_NOT_FOUND",
    "PORTFOLIO_ITEM_CONFLICT",
    "UNAUTHORIZED",
    "INTERNAL_ERROR",
]);

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const apiErrorIssueDtoSchema = z.object({
    path: z.string(),
    message: z.string(),
});

export type ApiErrorIssueDto = z.infer<typeof apiErrorIssueDtoSchema>;

export const apiErrorDtoSchema = z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    statusCode: z.number().int(),
    issues: z.array(apiErrorIssueDtoSchema).optional(),
});

export type ApiErrorDto = z.infer<typeof apiErrorDtoSchema>;
