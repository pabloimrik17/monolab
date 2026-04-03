# Implementation Tasks

## 1. Domain

- [ ] 1.1 Create `SectorTarget` entity in `investlab-domain`: id, sector (Sector enum), targetPercent (number), createdAt, updatedAt
- [ ] 1.2 Create `SectorTargetRepository` interface: findAll, upsertAll(targets[]), validate sum=100%
- [ ] 1.3 Create `SectorAllocation` value object: sector, actualAmount, actualPercent, targetPercent, difference
- [ ] 1.4 Create `SectorAllocationCalculator` domain service: takes active entries + instruments + quotes, returns SectorAllocation[]
- [ ] 1.5 Define Inversify tokens for SectorTargetRepository and SectorAllocationCalculator
- [ ] 1.6 Add to domain ContainerModule

## 2. Data

- [ ] 2.1 Create Drizzle schema for `sector_targets` table (id, sector, target_percent, created_at, updated_at)
- [ ] 2.2 Generate migration with `drizzle-kit generate`
- [ ] 2.3 Create `SectorTargetMapper` with toDomain/toRow methods
- [ ] 2.4 Implement `SectorTargetRepositoryImpl` — findAll, upsertAll with sum validation
- [ ] 2.5 Bind in data ContainerModule
- [ ] 2.6 Apply migration: `drizzle-kit migrate`

## 3. UI

- [ ] 3.1 Create sector allocation table component: Sector | Actual $ | Actual % | Target % | Difference | Status indicator
- [ ] 3.2 Implement color-coded status: green (within +/-2%), red (over), yellow (under)
- [ ] 3.3 Create sector target configuration form: row per sector with number input, running total, submit validates sum=100%
- [ ] 3.4 Add route/section for sector allocation view (under /roger/sectors or within /roger)
- [ ] 3.5 Wire allocation calculator: fetch active entries, instruments, quotes -> compute -> render table
- [ ] 3.6 Handle "Unclassified" bucket for instruments without sector (always last row)

## 4. Verification

- [ ] 4.1 Run `pnpm nx run investlab-domain:build`
- [ ] 4.2 Run `pnpm nx run investlab-data:build`
- [ ] 4.3 Run `pnpm nx run investlab:build`
- [ ] 4.4 Verify target configuration: set targets summing to 100%, reject invalid sums
- [ ] 4.5 Verify allocation calculation with active entries across multiple sectors
- [ ] 4.6 Verify color indicators: create scenarios for over/under/on-target
- [ ] 4.7 Verify "Unclassified" handling with instruments missing sector
