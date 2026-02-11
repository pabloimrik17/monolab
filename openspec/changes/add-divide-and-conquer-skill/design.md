## Context

Users have implementation plans (OpenSpec tasks.md or similar) with many tasks. Claude Code offers three execution mechanisms:
- **Sequential**: single session, linear execution
- **Subagents**: parallel Task tool calls within one session, results return to caller
- **Team agents**: independent Claude Code sessions with shared task list, messaging, self-coordination

No tooling exists to analyze a plan and choose the right strategy. Team agents specifically lack file conflict detection ("last write wins" = destructive overwrites).

## Goals / Non-Goals

**Goals:**
- Analyze plans: parse tasks, infer files, build deps, detect conflicts
- Route to optimal strategy based on plan characteristics
- Execute directly using appropriate tool calls
- Protect against file conflicts via deps + ownership constraints

**Non-Goals:**
- Generating the plan itself (plan already exists)
- Recovery from failed sessions/agents
- Multi-plan orchestration

## Decisions

### 1. Three-strategy routing model
**Decision:** Analyze plan → decide between sequential / subagents / team agents → execute directly.

**Rationale:**
- Each mechanism has different tradeoffs (cost, coordination, communication)
- No one-size-fits-all; plan characteristics determine best strategy
- Direct execution removes human coordination overhead

**Decision criteria:**

| Signal            | Sequential     | Subagents           | Team Agents          |
|-------------------|----------------|---------------------|----------------------|
| # independent groups | ≤1          | 2-4                 | 3+                   |
| File conflicts    | High overlap   | Low-moderate        | Low, clear ownership |
| Inter-task comms  | N/A            | Not needed          | Needed               |
| Task complexity   | Any            | Focused, scoped     | Complex, open-ended  |
| Token cost        | 1x             | ~1.5-2x             | ~3-4x                |

### 2. File conflict detection via inference + codebase analysis
**Decision:** Infer files per task from task text + grep codebase for references. (Unchanged from v1)

**Rationale:**
- Task text mentions entities ("Add UserService") → infer path
- Grep finds where entities are defined/imported
- Critical for team agents where "last write wins" is destructive

### 3. Relative complexity units (1-5)
**Decision:** Assign relative complexity per task, not absolute time. (Unchanged from v1)

### 4. File conflict → automatic dependency injection
**Decision:** When two tasks share files and route to subagents/teams, automatically add `addBlockedBy` constraint between them.

**Rationale:**
- Team agents have no built-in file conflict prevention
- Forcing sequential execution of conflicting tasks is safe default
- Better than hoping spawn prompts prevent overwrites

### 5. File ownership in spawn prompts
**Decision:** When routing to team agents, include explicit file ownership per teammate in spawn prompt.

**Rationale:**
- Team agents docs recommend "each teammate owns different files"
- D&C has the file-to-task mapping to formalize this
- Spawn prompt: "You own src/auth/*. Do NOT modify src/api/*."

### 6. Direct execution via tool calls
**Decision:** D&C executes the chosen strategy directly instead of generating instructions.

**Rationale:**
- Subagents: spawn Task tools in parallel
- Team agents: TeamCreate → TaskCreate ×N (with addBlockedBy) → Task spawn ×M (with file ownership)
- Removes human coordination, which was the bottleneck in v1

**Alternatives considered:**
- Generate instructions for human → v1 approach, too much friction
- Generate `claude -p` commands → superseded by team agents

## Risks / Trade-offs

**[Risk] File inference imprecise** → Conservative: when uncertain, add dependency (sequential fallback for those tasks).

**[Risk] Strategy selection wrong** → Mitigated by clear criteria. Worst case: subagents when teams would be better = slightly less coordination, still parallel.

**[Risk] Team agents experimental** → Feature flag gated. Subagents as fallback if teams unavailable.

**[Trade-off] Token cost of team agents** → D&C only routes to teams when analysis justifies the cost (enough independent tasks, clear ownership split).

**[Trade-off] No inter-phase human verification** → v1 had phases with human checkpoints. Now DAG deps handle ordering automatically. Trade explicit human gates for smoother execution.
