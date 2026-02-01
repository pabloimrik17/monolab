## 1. Command File

- [x] 1.1 Create `claude-plugins/experiments/commands/ralph.md` with frontmatter (description)
- [x] 1.2 Write command instructions that parse user description argument
- [x] 1.3 Add logic to prompt for description if not provided

## 2. PRD Generation

- [x] 2.1 Add instructions to extract features/tasks from user description
- [x] 2.2 Define prd.json structure in command (name, items array)
- [x] 2.3 Add instructions to generate kebab-case IDs for each item
- [x] 2.4 Add instructions to generate reasonable successCriteria per item

## 3. File Generation

- [x] 3.1 Add instructions to create empty progress.txt
- [x] 3.2 Add PROMPT.md template with @-references and iteration instructions
- [x] 3.3 Add instructions to fill PROMPT.md with project context from user description

## 4. Script Generation

- [x] 4.1 Add ralph-once.sh template (HITL single iteration)
- [x] 4.2 Add ralph.sh template (AFK loop with max iterations)
- [x] 4.3 Include Docker sandbox commands: `docker sandbox create claude .` and `docker sandbox run ralph-sandbox --`
- [x] 4.4 Include completion detection for `<promise>COMPLETE</promise>`
- [x] 4.5 Add instructions to make scripts executable

## 5. Documentation

- [x] 5.1 Update `claude-plugins/experiments/README.md` with ralph command usage
- [x] 5.2 Update `claude-plugins/experiments/commands/hello-experiments.md` to list ralph as available experiment

## 6. Verification

- [x] 6.1 Test command with sample description
- [x] 6.2 Verify all 5 files generated correctly
- [x] 6.3 Verify scripts are executable
- [x] 6.4 Verify PROMPT.md contains correct @-references
