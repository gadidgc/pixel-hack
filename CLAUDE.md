# Instructions for Claude (any team member's session)

Team pixel-hack · Hack the Andes 2026 (Lima, Oct 17–18) · Track **Seguridad**.
Members: Gabriel, Cesar, Mauricio, Piero. Market: **Peru first, then LatAm**. The team writes in Spanish or English; answer in the language you're asked in.

Always read [CONTEXT.md](CONTEXT.md) first. It holds the rubric, rules, Peru data, and personas.

## When someone says "sintetiza" (or "synthesize", "update the board")
1. `git pull`, then read **every file** in `members/*/`, including images (describe what's in them).
2. Pull out each distinct idea and each piece of evidence (interview, screenshot, data point). Merge duplicates across members and credit everyone who contributed.
3. For each idea, estimate the judges' score (CONTEXT §2), 1–5 each:
   - **Traction (×6)**: count only *real external evidence* in the inboxes (interviews, users, messages). No evidence means 1, whatever the idea's merits.
   - **Technical effort (×8)**: the planned technical core that can be built in the remaining hours.
   - **Pitch (×6)**: how clear the problem is, and whether a judge can see the demo from a URL in 3 min.
   - Projected score = T×6 + E×8 + P×6 (out of 100).
4. Rewrite [SYNTHESIS.md](SYNTHESIS.md): ranking table, then per idea its evidence (with file links), its gaps, and **the next concrete action plus who does it**.
5. Add a short "What changed since last synthesis" line at the top.
6. Be a proactive teammate: say which idea you would pick and why, and name the one piece of evidence that would change your mind.
7. Commit with message `synthesis: <date time>` and push, only if the person asked you to push.

## Rules
- Never invent evidence or users. Mark estimates and secondary-source numbers as such.
- Never commit secrets, credit codes, or third parties' personal data. If a file in an inbox has them, flag it and don't copy it into the synthesis.
- Keep "what works" separate from "pending ideas" (this is a requirement of the event).
