# Prompt 1 — Generate

Attach: `AI-INSTRUCTIONS.md`, `BRIEF.md`, `contract/types.ts`, `contract/fixtures.ts`.
Do **not** attach the reference implementation or the eval cases — the point is to see what the system produces without the answer.

---

You are building one React component on the Foundry design system.

Read `AI-INSTRUCTIONS.md` first. It is the contract: allowed components, the complete list of colour tokens, accessibility rules and behaviour rules. Anything not in it doesn't exist.

Then read `BRIEF.md` for who uses this panel and what they're deciding, and `contract/types.ts` for the props.

Build `FindingsReviewPanel.tsx`.

Requirements:
1. Implement all four states: loading, error, empty, ready.
2. Follow every rule in AI-INSTRUCTIONS.md → "Behaviour rules". Check your work against the fixture in `contract/fixtures.ts`: it contains a finding below 0.50, one in the 0.50–0.74 band and one with incomplete evidence.
3. Use only the listed imports and only the listed `--color-*` tokens.
4. Make it look considered: clear hierarchy, HIGH findings easy to spot, decisions easy to reach. Restraint over decoration.

Before you answer, check your file against the acceptance criteria table in BRIEF.md and fix anything that fails.

Return:
- The complete file in one code block.
- After it, at most five bullets: any `// NOTE:` you left, and any criterion you're unsure you met. Don't claim criteria you haven't checked.
