---
name: writing-plans
description: "Use only when the user explicitly asks for an implementation plan or asks to turn an approved design or specification into actionable implementation steps."
---

# Writing Plans

Turn an approved design, specification, or clearly defined request into a practical implementation plan. The plan should give a coding agent or developer enough context to implement the work without rediscovering key decisions.

This skill is platform-independent and can be used by coding agents, general AI assistants, and web-based AI interfaces.

## Activation

Use this skill **only when the user explicitly asks** to create, write, or revise an implementation plan.

Do not activate it automatically after brainstorming unless the user has approved the design and explicitly asked to continue to planning. Continuing straight into a plan is only appropriate when that request is explicit — inferring it from context is exactly what this rule exists to prevent (see step 8 for the matching rule about implementation).

## Workflow

### 1. Confirm scope and review source material

Before planning, make sure the intended result is clear enough to plan. Establish:

- What will be built or changed, and why it is needed
- What behavior defines success
- Which requirements, constraints, and non-goals apply
- Whether there is an approved design or specification to work from

Do not invent missing requirements. If an important uncertainty would materially change the plan, ask one focused question at a time before proceeding.

Read the approved design, specification, issue, or user-provided requirements, and identify any unresolved decisions. If no formal design exists, planning may still proceed when the request is small and sufficiently clear; if design decisions remain unresolved, return to clarification or brainstorming first.

For an existing project, inspect the relevant code, configuration, documentation, and conventions when access is available. Base file paths and implementation details on the actual project rather than guesses.

### 2. Check the scope

Make sure the work can be implemented as one coherent plan.

If it contains several independent systems or goals, suggest splitting it into separate plans. Each plan should produce a useful, testable outcome and state any dependency on the others.

### 3. Define the technical approach

State clearly which technology will be used and how it supports the implementation. Name the relevant:

- Programming languages and runtimes
- Frameworks, libraries, and major packages
- Databases, storage systems, and external services
- APIs, protocols, build tools, and deployment platforms
- Existing project technologies that must be retained

Explain the role of each important technology and why it fits the approved design. Include versions only when they are known or required by the project. Do not invent a stack; inspect the project or ask the user when the technology choice would materially affect the plan.

Then identify the main files, components, services, or configuration areas involved. For each one, state its responsibility and whether it will be created, modified, or removed.

Follow existing project patterns. Include targeted structural improvements only when they are necessary for the requested work. Avoid unrelated refactoring.

When the environment does not provide access to the project, clearly mark file paths or project-specific commands that require confirmation instead of presenting guesses as facts.

### 4. Break the work into validated tasks

Organize the implementation into ordered, independently understandable tasks. Each task should deliver a meaningful unit of progress, and should include:

- The outcome it produces
- Relevant files or project areas
- The implementation steps
- Important interfaces, dependencies, or constraints
- How it will be checked — the lightest validation that gives reasonable confidence, such as running an existing or new targeted test, a build/type-check/lint pass, or manually checking a user-visible flow

Keep setup, configuration, documentation, and cleanup with the task that needs them unless they form a meaningful deliverable on their own.

Do not split the plan into artificial 2-5 minute actions. Prefer coherent tasks that an implementer can complete and review without excessive ceremony. Do not require test-first development, repeated test runs, or exhaustive verification unless the user or project explicitly requires it — but for security-sensitive, data-changing, or high-risk work, include stronger validation than a manual check.

### 5. Write the plan

Use the user's requested format and location. If none is specified and files are supported, use a clear project-appropriate path such as:

`docs/plans/YYYY-MM-DD-<feature-name>.md`

In a chat-only interface, present the complete plan in the conversation instead.

The template below assumes a file-based coding project. Treat it as a starting point, not a fixed schema — for non-code work (content, research, operational changes) or environments without a filesystem, adapt or drop fields like `Project Areas` and file paths accordingly rather than forcing empty ones in:

```markdown
# [Feature Name] Implementation Plan

## Goal

[What this plan will achieve.]

## Scope

[What is included and excluded.]

## Approach

[Explain the implementation strategy and the main technical decisions.]

**Technology:**

- Language/runtime: [name and version, if known]
- Frameworks/libraries: [names and roles]
- Data/storage: [database or storage technology, if applicable]
- APIs/services: [external or internal integrations, if applicable]
- Build/deployment: [relevant tools and platform]

Explain why these technologies are being used and note any required compatibility or project constraints. Do not leave technology choices implicit.

## Project Areas

- Create: `path/to/file` - purpose
- Modify: `path/to/file` - intended change
- Remove: `path/to/file` - reason, if applicable

## Tasks

### 1. [Task name]

**Outcome:** [Concrete result]

**Areas:**
- `path/to/file`

**Steps:**
1. [Specific implementation action]
2. [Specific implementation action]

**Validation:** [Command or concise check]

## Completion Criteria

- [Observable requirement]
- [Observable requirement]
```

Adapt the template to the request. Omit empty sections and avoid repeating information.

### 6. Review once

Before handing off, perform one lightweight review:

- Every approved requirement is covered
- Tasks are ordered by dependency
- File paths and commands are based on known project information
- Interfaces and names are consistent
- No TODO, TBD, or vague instruction remains
- Completion criteria describe observable results

Fix clear issues directly. Do not create repeated review loops or dispatch additional reviewers unless the user asks or the work is unusually high-risk.

### 7. Hand off

Tell the user where the plan was saved or present it directly. Summarize any assumptions or decisions that still require confirmation.

Do not begin implementation unless the user explicitly asked for it. The one exception: if the *original* request explicitly asked for both a plan and its implementation in the same breath ("write a plan and then build it"), and the plan contains no unresolved decisions, proceed straight into implementation using the approved plan. Inferring that intent from context — without the user having said so — is not enough; when in doubt, stop and ask.

## Writing Guidelines

- Be specific enough to act on, but do not reproduce entire source files unnecessarily.
- Use exact paths, commands, and interface names only when they are known; mark unknowns for confirmation rather than guessing.
- Explain intent and outcomes, not just mechanical edits.
- Include examples or pseudocode only when they remove meaningful ambiguity.
- Apply YAGNI: plan only what is needed for the approved result.
