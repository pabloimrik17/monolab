# @m0n0lab/investlab-data-contracts

HTTP wire-format DTOs and zod schemas shared between server and client sides of InvestLab.

Entities (from `investlab-domain`) never cross HTTP. This package is the canonical representation at the HTTP boundary: server-side datasources map entities → DTOs on response; client-side datasources map DTOs → entities on receipt.
