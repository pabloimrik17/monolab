## Context

Users have implementation plans (OpenSpec tasks.md or similar) with many tasks. Executing linearly wastes time when independent tasks could run in parallel across Claude Code sessions. The challenge: detecting which tasks can safely parallelize without file conflicts.

Current state: No tooling exists. Users manually guess parallelization, risking merge conflicts.

## Goals / Non-Goals

**Goals:**
- Analyze existing plans to identify parallelization opportunities
- Generate phase-based division where sessions within a phase don't conflict
- Provide ready-to-use `claude -p` commands
- Only recommend parallelization when speedup justifies complexity (~20%+)

**Non-Goals:**
- Generating the plan itself (plan already exists)
- Automatic session launching (output is instructions, not scripts)
- Automatic verification between phases (human controls transitions)
- Recovery from failed sessions (human assists in that session)

## Decisions

### 1. Phase-based execution model
**Decision:** Organize tasks into sequential phases, with parallel sessions within each phase.

**Rationale:**
- Phases provide natural synchronization points
- Human can verify before advancing
- Simpler than full DAG scheduling

**Alternatives considered:**
- Full DAG with dynamic scheduling → Too complex, requires automation
- Pure linear with optional parallelism → Loses structure, harder to reason about

### 2. File conflict detection via inference + codebase analysis
**Decision:** Infer files per task from task text + grep codebase for existing references.

**Rationale:**
- Task text often mentions entities ("Add UserService") → infer path
- Grep finds where entities are defined/imported
- Hybrid catches both new files and modifications

**Alternatives considered:**
- Require explicit file lists in plan → Burden on plan author
- Pure text inference → Misses modifications to existing files
- Execute dry-run → Too expensive, not practical

### 3. Relative complexity units (1-5) instead of time estimates
**Decision:** Assign relative complexity (1-5 units) per task, not absolute time.

**Rationale:**
- Absolute time highly variable and unpredictable
- Relative comparison sufficient for balancing sessions
- Enables speedup calculation without false precision

### 4. Session addition threshold: 30% phase time reduction
**Decision:** Only add parallel session if it reduces phase time by ≥30%.

**Rationale:**
- Avoids "orphan" sessions (1 unit while others have 8)
- Each session has operational overhead (terminal, monitoring)
- 30% ensures meaningful contribution

### 5. Plan file passed to all sessions, with task subset instruction
**Decision:** Each session receives full plan file + instruction "implement tasks X, Y, Z".

**Rationale:**
- Full plan provides context (what came before, what comes after)
- Subset instruction keeps focus
- Avoids creating separate plan fragments

### 6. Output format: Instructions with `claude -p` commands
**Decision:** Output human-readable instructions with copy-paste commands.

**Rationale:**
- Simple, no automation required
- User controls when/how to launch
- Easy to adjust if needed

**Alternatives considered:**
- Generate shell script → Adds complexity, less flexible
- Integration with tmux/screen → Platform-specific, over-engineered

## Risks / Trade-offs

**[Risk] File inference is imprecise** → Mitigated by conservative grouping. When uncertain, keep tasks in same session. User can override.

**[Risk] Dependency detection misses implicit deps** → Mitigated by analyzing task order (earlier tasks likely dependencies). User validates division.

**[Risk] Complexity estimates inaccurate** → Mitigated by relative units, not absolute. Balance matters more than precision.

**[Trade-off] No automation** → Simpler but requires human coordination. Acceptable for v1, automation can come later.

**[Trade-off] Single-change focus** → Designed for one plan at a time. Multi-plan orchestration out of scope.
