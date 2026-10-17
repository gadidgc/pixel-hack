# pixel-hack · Hack the Andes 2026 · Track: Seguridad

Lima, Oct 17–18, 2026 · 30 h · Peru / LatAm focus.

## Layout
- [CONTEXT.md](CONTEXT.md): **shared context**. Rubric, rules, tools, Peru security data, personas. Everyone reads it first.
- [SYNTHESIS.md](SYNTHESIS.md): **scoreboard** Claude rebuilds from everyone's inbox (projected judge score per idea).
- [CLAUDE.md](CLAUDE.md): instructions any teammate's Claude session follows automatically.
- `members/`: one brainstorm folder per member: [gabriel](members/gabriel), [cesar](members/cesar), [mauricio](members/mauricio), [piero](members/piero).

## How we work (phase 1: idea storm)
1. Read [CONTEXT.md](CONTEXT.md) (10 min).
2. **Drop anything** into your inbox `members/<you>/`: ideas, links, screenshots, interview notes. No format needed.
3. `git add . && git commit -m "inbox" && git pull --rebase && git push`
4. Tell Claude **"sintetiza"**. It reads every inbox and rebuilds [SYNTHESIS.md](SYNTHESIS.md): every idea scored with the judges' formula, the evidence behind it, the gaps, and who does what next.
5. Repeat. Lock one idea once the board shows real evidence behind a winner.

Each of you can use your own Claude Code in this repo. It picks up [CLAUDE.md](CLAUDE.md) automatically, so everyone shares the same context and process.

## Never commit
Secrets, API keys, credit codes, or anyone's personal data.
