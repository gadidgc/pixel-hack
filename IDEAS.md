# Idea Board: Track Seguridad

Score with the CONTEXT §7 filter (1–5 each). Rubric reminder: traction 30%, **tech 40%**, pitch 30%.

| # | Idea | Sub-area | Proposed by | Pain | Reach | Demo | Tech | Feasible | Safe | LatAm | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | ¿Es Estafa? WhatsApp bot | Scams / impersonation | Claude | 5 | 5 | 5 | 4 | 4 | 5 | 5 | 33 |
| B | Yape Real: bodega payment verifier | Scams / merchants | Claude | 5 | 5 | 4 | 4 | 3 | 5 | 5 | 31 |
| C | Primera Hora: anti-extortion kit | Extortion / transport | Claude | 5 | 3 | 4 | 4 | 4 | 3 | 4 | 27 |
| D | Verifica el audio: viral-content checker | Disinformation | Claude | 3 | 4 | 4 | 4 | 3 | 5 | 4 | 27 |
| … | (add yours) | | | | | | | | | | |

---

## A. ¿Es Estafa? (recommended)
**Problem:** Peruvians get "hola mamá, cambié de número", fake bank texts, fake courier links, and now AI voice clones. Reports tied to Yape and WhatsApp are reportedly up about 120% in 2026.
**Product:** A WhatsApp number (via **Zavu**). You forward any suspicious message, link, screenshot, or audio, and in about 10 s you get a verdict in plain Spanish: 🟥 estafa / 🟨 sospechoso / 🟩 parece ok, plus *what to do now*.
**Technical core:** URL reputation and domain age, a lookalike-domain check (bcp-pe.com vs bcp.com.pe), a community reputation database of phone numbers, an LLM classifier tuned on Peruvian scam scripts, OCR on screenshots, and an optional voice-clone heuristic. A web dashboard shows live trends ("top scams in Lima this week").
**Traction in 30 h:** Share it in our family and university WhatsApp groups, then count real forwarded messages, unique users, and repeat users. This is real usage, which the rubric treats as a 5.
**Demo:** A judge sends a message from their own phone and gets an answer live on stage.
**LatAm:** Same flow for Pix, Nequi, and Mercado Pago scams.

## B. Yape Real
**Problem:** "Yape falso" apps and fake receipts hit bodegueros, who check the customer's screen because they're busy.
**Product:** A PWA or Android app that listens to the merchant's *own* payment notifications and **announces each confirmed payment aloud**, with a big green screen. A "verify screenshot" mode flags edited receipts.
**Technical core:** Notification parsing, image forensics (fonts, layout, metadata), and a ledger.
**Traction:** Install it in 5–10 bodegas near the venue.
**Risk:** It needs an Android notification listener, which is harder to show from a URL. Check whether Yape, BCP, or Izipay already sell a payment speaker; if they do, our angle is fake-receipt detection plus being free.

## C. Primera Hora (first-hour anti-extortion kit)
**Problem:** Only 27 of 83 extorted companies reported before an attack, because of fear. Victims don't know what to do in the first hour, and evidence gets lost.
**Product:** A private evidence vault: capture the threatening chat or audio, timestamp it, hash it, and store it encrypted. It also gives step-by-step guidance (111, PNP WhatsApp, OSIPTEL blocking, Fiscalía) and an anonymized heatmap of reports for the transport union.
**Risk:** Retaliation and data security. It is harder to get users in 30 h, and judges will probe safety hard.

## D. Verifica el audio
**Problem:** Viral fake audios and videos, including fake "police alerts" and political deepfakes.
**Product:** Forward the media, and it is checked against fact-checkers and news using Tavily, with deepfake signals.
**Risk:** The elections are over, so the pain is lower now, and deepfake detection is hard to make reliable in 30 h. It could be folded into A as a feature.

---

## Decision
- [ ] Each member adds at least 1 idea
- [ ] 2+ interviews backing the top idea
- [ ] Vote → **chosen idea:** ____
