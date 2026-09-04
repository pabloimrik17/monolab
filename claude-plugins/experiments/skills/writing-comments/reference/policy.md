# Comment policy

The single source of truth for which code comments are worth writing. `writing-comments` applies it before a comment is written; `purge-comment-noise` applies it to comments already written. Both read this file and nothing else.

## Scope is drawn by comment kind

**In scope:** free-form prose written as narration, in whichever comment form the language uses — `//`, `#`, `--`, `;` line comments and `/* */`, `<!-- -->`, `=begin … =end` block comments among them. Every rule below governs these and only these.

**Out of scope by construction.** Left exactly as found, whatever their length:

| Kind                          | Examples                                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API doc blocks                | JSDoc/TSDoc `/** … */`, Python docstrings and their equivalents, including on non-exported symbols                                                         |
| Tool pragmas and suppressions | `eslint-disable*`, `@ts-expect-error`, `@ts-ignore`, `biome-ignore`, `prettier-ignore`, `istanbul ignore`, `# noqa`, `# type: ignore`, `# pylint: disable` |
| Licence headers               | SPDX identifiers, copyright blocks                                                                                                                         |
| Tool directives               | shebangs, `@vitest-environment`, `/// <reference … />`, `@jsx`, `@vite-ignore`, `webpackChunkName`, `@generated`                                           |

The kind settles the question. Whether an out-of-scope comment earns its place is not this policy's business.

## Deny by default

Within scope, a comment earns its place by carrying information **not deducible from the code beside it**. The burden falls on the comment's existence, not on its removal: absent one of the reasons below, there is no comment.

**Justified:**

- **Workaround** — with a link to the issue or upstream report it works around.
- **Invariant or precondition** the code cannot express — an ordering requirement, a caller contract, a range the types do not narrow.
- **Non-obvious reason** for a choice that reads as wrong at first glance: why the slow path, why the duplicate, why not the obvious API.
- **Why a test case exists** — the bug it guards, the regression it pins, the reported issue it reproduces.

**Noise, in the four shapes it takes:**

- **Restatement** — the next line, in English. `// increment the counter` above `count++`. In a test, an assertion repeated in prose.
- **Change narration** — what this edit does, what it replaced, what stood there before.
- **Section announcement** — `// Step 1:`, `// --- helpers ---`, `// Main logic`.
- **Reasoning** — the author's thinking during the implementation, preserved after the implementation ends.

A justified comment fits in a line or two. Length is a symptom: prose that runs long has started narrating.

## TODO and FIXME

A `TODO` or `FIXME` carries a real issue or ticket identifier — `// TODO(MON-123): handle the empty case`. Without one it is a note addressed to nobody, and it is not written.

## Language

Comments are never translated. A retained comment keeps the language it was written in; normalising a codebase's comment language is a separate job, outside this policy.
