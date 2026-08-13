---
name: executing-plans
description: Use when executing a step-by-step implementation plan, especially when tasks are sequential, interdependent, or require verification between steps. Also use when the AI may be tempted to skip ahead, batch unrelated tasks, or assume a step succeeded without checking.
---

# Executing Plans

## Overview
This skill ensures that implementation plans are executed methodically, one step at a time, with explicit verification at each stage. The core rule: **do not move to the next step until the current step is confirmed complete and correct.** This checking is the default way of working under this skill, not a reaction reserved for when something looks wrong.

## When to Use

Use this skill when:
- A plan has been approved and it's time to implement
- Tasks are laid out in a specific order
- Skipping or combining steps could introduce subtle errors
- You feel an urge to "just get it done" quickly
- The plan involves code changes, file operations, or system modifications

Do NOT use for:
- Simple, single-step actions with no dependencies
- Exploratory or brainstorming sessions (those have their own skills)

## Core Pattern

For each step in the plan, apply the **STEP** loop:

1. **S**tate the step – announce what you're about to do and the expected outcome.
2. **T**ake action – execute precisely what the step describes. No more, no less.
3. **E**xamine results – verify the outcome against the expected result, using real evidence (see below), not assumption.
4. **P**roceed or pause – if verification passed, move to the next step. If anything is off, stop and resolve before continuing.

**Never execute Step N+1 until Step N has passed verification with actual evidence.**

### What counts as verification

"Verified" means you have concrete evidence, not that the step "should have worked." Depending on the step, that might be:

- Running an existing or new test and reading the result
- Inspecting command output or logs for the expected content
- Running a build, type check, or linter and confirming it's clean
- Visually checking a rendered result (UI, file, document) against the expected outcome
- Reading back a modified file to confirm the change is actually present

Match the check to the risk: a config typo fix might just need a re-read of the file; a data migration needs an actual query against the result.

### When a step can't be completed

If a step is blocked (missing access, failing dependency, environment error, contradictory instructions), do not improvise a workaround that goes beyond the plan's scope and do not skip ahead to unblock-adjacent steps. Stop, state clearly what's blocking progress, and surface it to the user with the options you see (retry, adjust the plan, request access, etc.) before proceeding.

## Quick Reference

| Situation | Action |
|-----------|--------|
| Step produces an unexpected output | Stop. Diagnose. Do not move on. |
| Multiple steps could technically be batched | Do them one at a time unless the plan explicitly says to batch. |
| Verification seems "obvious" or unnecessary | Verify anyway, with real evidence. Obvious things break silently. |
| A step is blocked and can't proceed as written | Stop and surface it — don't improvise past the plan's scope. |
| A step takes longer than expected | That's fine. The pace is set by correctness, not speed. |

## Common Failure Modes

- **Skipping verification:** Assuming a step worked without checking. Fix: always inspect output or run a test.
- **Batching unrelated steps:** Combining steps to "save time" but blurring dependencies. Fix: follow the plan's order exactly.
- **Not stopping on failure:** Noticing an error but continuing anyway. Fix: if a step fails, the plan is paused. Resolve fully before resuming.

## Rationalization Table (Why Agents Deviate from Plans)

| Excuse | Reality |
|--------|---------|
| "These steps are too simple to mess up" | Even simple steps can have environment-specific failures. |
| "I'll verify everything at the end" | Errors compound. Early detection prevents rework. |
| "I can fix that later" | 'Later' rarely comes. Fix it now. |
| "The user wants speed" | The user wants a working result. Speed is secondary to correctness. |

**Any of these mean: pause, and verify the current state with real evidence before taking another action.**
