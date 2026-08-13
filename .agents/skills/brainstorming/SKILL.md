---
name: brainstorming
description: "Use only when the user explicitly asks to brainstorm, explore, or design an idea before implementation. Clarify intent, outcomes, scope, and constraints before proposing a design."
---

# Brainstorming

Turn an early idea into a clear, practical design through collaborative discussion. This skill is platform-independent and can be used by coding agents, general AI assistants, and web-based AI interfaces.

## Activation

Use this skill **only when the user explicitly asks** to brainstorm, explore, design, or write a specification for an idea.

Do not activate it merely because a request involves creative or technical work. If the user asks directly for implementation without requesting brainstorming or design, follow the normal workflow instead.

## Core Rule

Do not begin designing until you understand:

- The idea and the problem it addresses
- Who or what it is for
- The outcome the user wants
- How success will be recognized
- Important requirements, constraints, and exclusions

Do not silently fill important gaps with assumptions. Ask relevant questions when missing information could materially change the design.

## Workflow

### 1. Understand the idea

Start with the user's description and form a provisional read of it. Identify unclear terms, missing context, and decisions that could lead to substantially different designs. Treat this understanding as a draft — it gets refined through the questions in step 2, not repeated wholesale later.

If the request contains several independent systems or goals, point that out early and help narrow or divide the scope before continuing.

### 2. Ask relevant questions

Ask **one question at a time**. The categories below are a checklist for you to scan and prioritize from internally — not a set of questions to put to the user together. Pick the single most design-relevant gap first.

Prioritize questions about:

- The problem and intended users
- The desired result and success criteria
- Required behavior and essential capabilities
- Existing systems, tools, or workflows
- Constraints and non-goals

Prefer multiple-choice questions when the likely options are known, but allow open-ended answers when discovery is needed. Ask only questions that affect the design. Avoid exhaustive interviews and minor details that can safely wait until planning or implementation.

### 3. Confirm before designing

This is a distinct checkpoint from step 1, not a repeat of it: step 1 was your working draft; this is the version you've now refined through the user's answers, and it's what you get explicit sign-off on before spending effort on a design. Briefly state:

- What will be designed
- What it should achieve
- The main constraints
- What is outside the current scope

If any important point remains uncertain, ask about it (one at a time, per step 2) before proceeding.

### 4. Explore approaches

Present 2-3 viable approaches when meaningful alternatives exist. For each, explain the main benefits, trade-offs, and situations where it fits best.

Recommend one approach and explain the reasoning. Do not invent alternatives merely to satisfy a number; for a straightforward decision, present the single sensible approach.

### 5. Present the design

Present a design appropriate to the size of the request. Cover only the relevant areas, such as:

- Overall structure or user flow
- Main components and responsibilities
- Important interactions or data flow
- Key decisions and constraints
- Essential error or edge-case behavior

Keep simple designs short. Add detail only where it prevents misunderstanding or supports a meaningful decision. Apply YAGNI: exclude features and abstractions that are not required.

Ask the user to approve the overall design or identify changes. For a large or uncertain design, validate it section by section instead. Do not proceed past this point until the user approves.

### 6. Document when requested or useful

Create a concise design or specification document if either is true:

- The user explicitly asked for one, or
- The design will be handed off beyond this conversation (e.g., to an implementation phase, a different session, or another person/agent) and needs to survive that handoff

If neither applies, a written document is optional — the agreed design already lives in the conversation.

Use the user's requested location and format. If none is specified and the environment supports files, choose a clear project-appropriate location. In a chat-only interface, present the document directly in the conversation.

### 7. Review

Perform one lightweight quality pass on the design (or document, if one was created):

- Remove placeholders and unresolved decisions
- Resolve contradictions
- Clarify requirements that could lead to materially different implementations
- Confirm that the scope is manageable and focused

Fix clear issues directly. Do not create repeated review loops or extensive test plans unless the user asks for them or the design is high-risk.

### 8. Hand off

After the review, end the brainstorming process and proceed to planning, implementation, or whatever the user requested next. Do not begin implementation yourself unless the user asks for it as a separate, explicit step.

## Operating Principles

- **Explicit use only:** Never activate this skill without a clear user request to brainstorm or design.
- **Understand before designing:** Establish intent, outcome, scope, and constraints first.
- **Ask, do not assume:** Clarify consequential uncertainty instead of inventing requirements.
- **One question at a time:** Keep the conversation easy to answer, even when scanning several candidate topics internally.
- **Right-size the process:** Use a short discussion for simple ideas and more depth only when needed.
- **Stay focused:** Avoid unrelated features, refactoring, and speculative complexity.
