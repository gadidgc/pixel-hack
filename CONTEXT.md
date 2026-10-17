# Hack the Andes 2026: Shared Team Context

> Single source of truth for the team. Every member reads this before brainstorming.
> Track: **04 · Seguridad (`security`)** · Market: **Peru first, then Latin America**.
> Last updated: 2026-10-17 (event day 1). Sources at the bottom.

---

## 1. The event in one screen

| Item | Detail |
|---|---|
| Dates | **Oct 17–18, 2026**, 30 hours, in person, Lima |
| Organizer | Crafter Station · Main sponsor: Chofex · Ally: Peru Tech Week |
| Size | 100 people, 1–4 per team, 4 tracks, max 12 teams per track |
| Prizes | 1st **S/ 6,000**, 2nd **S/ 2,000**, plus a trip to Chofex HQ (SF / Monterrey), StartUPC mentorship, Qatom and AtomicMemory credits |
| Pitch | **3 min pitch + 2 min Q&A**, on the organizers' computer (not ours) |
| Submission | Deployed app URL · Presentation URL · GitHub repo URL · Markdown description |

### Security track brief (official wording)
> "Extorsión, estafas, seguridad de comercios y transportistas, suplantación y desinformación."

So there are five sub-areas: **extortion · scams · security for merchants and transport workers · impersonation · disinformation**.
Choose the track by the *main* problem the project solves.

---

## 2. Judging rubric (this decides everything)

Each judge gives a whole-number score from **1 to 5** on three criteria. The score out of 100 is:

```
score = traction × 6 + technical effort × 8 + pitch × 6
```
The team result is the average across active judges. Example: 3 / 4 / 5 = 80.

| Criterion | Weight | 1 | 3 | 5 |
|---|---|---|---|---|
| **Traction** | 30% | No evidence | Interviews or verifiable signals | Real use, retention, or strong demand |
| **Technical effort** | 40% | Template with minimal changes, or doesn't work | Working product with its own logic and integrations | Solid engineering and justified decisions |
| **Pitch** | 30% | Problem or solution unclear | Clear explanation and demo | Convincing proposal, clear demo, precise answers |

Notes:
- "Using AI does not cost points by itself." Agents are fine; we stay responsible for every claim.
- "Traction values external evidence." In 30 hours that means **real interviews with bodegueros / drivers / users**, a waitlist, a WhatsApp group with real people, or messages people actually forwarded to our bot. Screenshots plus quotes go in the progress log (bitácora).
- Technical effort is the biggest weight (40%). We need our own logic plus real integrations, not a CRUD wrapper over an LLM.

### What this means for idea selection
1. **Users we can reach today in Lima.** We can walk into a bodega or talk to a mototaxi or combi driver within a few hours. That is how we earn traction points.
2. **A demo that works in 3 minutes from a URL** on someone else's laptop. Nothing local, no login wall, works in a private window.
3. **A technical core that is hard to fake**, such as classification, fraud signals, verification, voice, geodata, or a WhatsApp bot with state.

---

## 3. Submission and presentation rules (checklist)

- [ ] One submission per team. Any member can edit it; there is no captain permission.
- [ ] **Deployed app URL** works in a private / incognito window, with no session and no access requests.
- [ ] **Presentation URL** (Canva, Google Slides, or a code-based deck), publicly reachable.
- [ ] **GitHub repo URL** (this repo, made public before submission).
- [ ] **Markdown description**: keep "what works" separate from "pending ideas" (this is required).
- [ ] Post to the progress log (bitácora) after big decisions, user tests, demos, and blockers. It becomes public later.
- [ ] **No secrets, tokens, credit codes, or third-party personal data** in the repo, log, or description.
- [ ] Submit **early** and update later. Changes made after evaluation opens do **not** reach the judges.
- [ ] Keep the deployment and slides online through evaluation.
- IP: we keep ownership of what we build; the event takes no assignment of rights.
- Conduct: ask consent before photographing or recording people. This matters for user interviews: get consent and anonymize.

---

## 4. Tools and credits we get (all participants)

| Sponsor | What | Possible use for us |
|---|---|---|
| **Zavu** (3 mo Pro) | One API for **WhatsApp, SMS, voice**, email, Telegram, plus voice agents | A WhatsApp bot is how you reach Peruvians. Use it to forward suspicious messages or report extortion. |
| **ElevenLabs** (startup program) | Voice synthesis / cloning | Voice UX for older users, or a demo of voice-clone scams |
| **Tavily** | Search API for agents | Real-time checks of claims, numbers, and URLs |
| **Apify** | Scraping / actors | Collect public scam posts, fake pages, and Facebook Marketplace listings |
| **n8n** (1 wk Cloud Pro) | Workflow automation | Glue: alerts, escalation to PNP / family, dashboards |
| **Qatom** (6 mo Max) | AI dev platform | Building and agents |
| **AtomicMemory Cloud** (5 mo Pro) | Agent memory | Remember reported numbers or patterns per user |
| **Maritime** ($100) | Agent hosting / infra | Deploy |
| **Lovable** | App builder | Fast frontend (but technical effort needs our own logic underneath) |

> Using sponsor tools well can impress sponsor judges, but only if it is real.

---

## 5. The problem space: Peru 2026 (with numbers)

### 5.1 Extortion (extorsión): the #1 security issue in Peru
- **12,634** extortion / blackmail complaints in **Jan–Jun 2026** (Ministerio Público), about 1,053 per month. **13,892** by July.
- **26,217** complaints from Aug 2025 to Jul 2026, more than **5×** the 2021 figure (IPE). Sentenced prisoners went *down* from 712 to 650.
- Hotspots: **Lima Este (1,638)**, La Libertad (1,435), Lima Centro (1,309), Lima Norte (1,163), Lima Sur (1,155).
- **Transport:** **80+ drivers killed and 160 attacks** on buses in Lima and Callao in 2026 (La República, Oct 4). There were 107 attacks by mid-July, matching all of 2025.
- **Under-reporting:** of 83 affected companies, only **27 reported before an attack**. The main reason is **fear of retaliation**.
- Economic effect: transport workers and merchants **raise prices** to cover the "cupos" (protection payments).
- Existing state channels: **Central 111** (anonymous, 24/7), PNP WhatsApp numbers, 105 emergencies, and OSIPTEL blocking (1.5M phones blocked; a decree against "líneas fantasma" was proposed Feb 2026). Gaps: low trust, fear, fragmented evidence, no follow-up, and victims don't know what to do in the first hour.

### 5.2 Digital scams and wallets (estafas): Yape / Plin
- **21,000+** reports of cybercrime tied to AI, Yape, and WhatsApp in 2026, **+120%** year over year (specialist estimate, Infobae Aug 2026; not an official figure).
- About **90%** of computer-fraud cases go through digital wallet accounts (attributed to PNP cybercrime; secondary source).
- Q1 2025: **7,206** computer-fraud complaints and about **3,000** identity-theft complaints (official figures understate the real volume).
- Yape + Plin carry **more than 67%** of digital transactions (BCRP, secondary source).
- Common methods:
  - **"Yape falso"**: a cloned app shows a fake payment screen. Sold on Telegram, it targets **bodegueros** and merchants.
  - **Fake receipts and tampered QR codes**: a fake QR is stuck over the real one.
  - **Phishing** that imitates banks or wallets (the main entry point for SMEs).
  - **SIM swap** to capture SMS codes.
  - **WhatsApp impersonation** ("hola mamá, cambié de número…") and **AI voice cloning** of relatives.
- Merchant rule of thumb: check incoming money in **your own** app, never on the customer's screen. Many don't, because they're busy.

### 5.3 Impersonation (suplantación)
- Voice cloning, cloned WhatsApp numbers, fake bank or police calls, and fake "SUNAT / Reniec / courier" messages.
- In LatAm, AppGate's Fraud Beat 2026 describes fraud running as an industrial chain from social media to cash withdrawal, growing up to **228%** in some countries. It also cites synthetic identities and deepfakes becoming routine.
- Group-IB found 97+ fraudulent domains targeting four major LatAm brands in one year.

### 5.4 Disinformation (desinformación)
- 2026 general election cycle: the **JNE logged 704 disinformation alerts** in 11 months, 65% of them in Dec 2025–Jan 2026. A post-electoral crisis followed.
- Disinformation in elections is **not a specific crime** in Peru. A deepfake bill (PL 13975/2025) was proposed; its status is unconfirmed.
- **6 million young voters** are heavily exposed to viral content on TikTok and WhatsApp.
- The JNE has an AI fact-checking monitor plus factchecking@jne.gob.pe. Citizens lack a **fast, WhatsApp-native** way to check a forwarded audio, image, or video.
- Disinformation also feeds extortion and scams: fake "alerts" and fake police notices.

### 5.5 Regional context (LatAm)
- Brazil: the Pix **MED** refund mechanism for scam victims, plus a bill to block, trace, and refund Pix fraud. This is a precedent for a "Yape/Plin MED".
- Colombia: discussions on loans tied to identity theft. The region is moving toward UK/Australia-style **reimbursement rules**.
- Scams are growing faster in LatAm than globally (BioCatch). Criminals focus on consumers, who are less protected.
- Anything that works for Yape / Plin bodegas in Peru maps to **Pix (BR), Nequi / Daviplata (CO), Mercado Pago (MX / AR)**. That is the "LatAm scale" slide.

---

## 6. Personas we can interview *today* (traction)

| Persona | Pain | Where to find them in 30 h |
|---|---|---|
| **Bodeguero / bodeguera** | Fake Yape screens, QR swaps, extortion cupos | Any bodega near the venue |
| **Combi / bus / mototaxi driver** | Cupos, threats, attacks, route "permits" | Paraderos, transport groups on WhatsApp / Facebook |
| **Older parent (50+)** | "Hola mamá" scams, voice clones, fake bank calls | Our own families (call them!) |
| **Young voter / student** | Viral fake news, deepfakes on TikTok | Hackathon participants, university groups |
| **Small online seller** (Marketplace / IG) | Fake receipts, fake buyers, chargebacks | Facebook Marketplace, IG shops |
| **Transport company manager** | Must decide whether to report; fears retaliation | Transport associations (harder in 30 h) |

Interview script (5 min): *What happened last time? What did you do in the first hour? What did it cost? Who did you tell? What would you pay or use?* Record quotes and get consent. Anonymize.

---

## 7. Evaluation filter for ideas (score each 1–5)

| Filter | Question |
|---|---|
| Pain | Is it in the top 3 of what Peruvians fear in 2026? |
| Reach | Can we get 10+ real users or interviews before the pitch? |
| Demo | Can a judge use it from a URL (or a WhatsApp number) in 60 seconds? |
| Tech depth | Is there real logic (detection, verification, state, integrations)? |
| Feasibility | Can 4 people build the core in about 20 hours? |
| Safety | Does it avoid putting victims at risk (retaliation, data leaks)? |
| LatAm scale | Does it translate to Pix / Nequi / Mercado Pago countries? |

---

## 8. Sources
- Event: [hacktheandes.com](https://hacktheandes.com/) · [Team guide](https://hacktheandes.com/guide) · [Submission terms](https://hacktheandes.com/participation-terms) · [Terms](https://hacktheandes.com/terms)
- Extortion: [RPP: 12,000+ complaints H1 2026](https://rpp.pe/peru/actualidad/ministerio-publico-informo-que-mas-de-12-000-denuncias-por-extorsion-se-registraron-en-el-primer-semestre-de-2026-noticia-1697877) · [Canal N: 12,600 H1](https://canaln.pe/actualidad/ministerio-publico-reporta-mas-12600-denuncias-extorsion-primer-semestre-2026-n493520) · [Swissinfo: 13,000 Jan–Jul](https://www.swissinfo.ch/spa/per%C3%BA-registra-m%C3%A1s-de-13.000-denuncias-por-extorsi%C3%B3n-entre-enero-y-julio-de-2026/91995447) · [El Comercio: 4,761 → 26,217](https://elcomercio.pe/peru/extorsion-denuncias-pasan-de-4761-a-26217-pero-presos-sentenciados-bajan-de-712-a-650-apuesplan-noticia/) · [La República: 80+ drivers killed](https://larepublica.pe/sociedad/2026/10/04/extorsion-al-transporte-en-lima-y-callao-deja-mas-de-80-conductores-asesinados-y-160-atentados-en-2026-376216) · [Caretas: 60+ drivers](https://caretas.pe/sociedad/extorsion-en-el-peru-mas-de-60-choferes-fueron-asesinados-en-lo-que-va-del-2026-segun-la-pnp/) · [Infobae: prices rise from cupos](https://www.infobae.com/peru/2026/03/31/pnp-alerta-aumento-de-extorsiones-en-lima-transportistas-y-comercios-suben-precios-por-cobros-ilegales/) · [Infobae: 2,000 cases Feb](https://www.infobae.com/peru/2026/02/20/peru-supera-los-2000-casos-de-extorsion-en-lo-que-va-de-2026-lima-y-la-libertad-concentran-la-mayoria-de-los-casos/)
- State channels: [Central 111](https://canaln.pe/actualidad/central-111-contra-extorsiones-ha-recibido-188-llamadas-n477223) · [1.5M phones blocked](https://caretas.pe/?p=769466) · [Ghost-line decree](https://panamericana.pe/buenosdiasperu/locales/465099-adios-llamadas-fantasma-decreto-legislativo-propone-bloquear-numeros-usados-extorsiones) · [How to report](https://lpderecho.pe/como-denunciar-llamadas-extorsionadoras/)
- Scams: [Infobae: AI voice + fake receipts](https://www.infobae.com/peru/2026/08/19/ciberdelitos-con-inteligencia-artificial-suplantacion-de-voz-y-comprobantes-falsos-el-nuevo-riesgo-en-yape-y-whatsapp/) · [Scamwatch: Yape/Plin 2026](https://scamwatchhq.com/peru-scams-2026-yape-digital-wallet-fraud/) · [Reevalua: common scams](https://reevalua.com/blog/estafas-yape-plin-como-evitar-peru) · [Business Empresarial: SMEs](https://www.businessempresarial.com.pe/pymes-peruanas-fraude-via-whatsapp-y-suplantacion-de-yape-son-las-modalidades-mas-utilizadas-por-ciberdelincuentes/)
- Disinformation: [CEPLAN: 704 alerts](https://observatorio.ceplan.gob.pe/ficha/tg60) · [Infobae: JNE 700 alerts](https://www.infobae.com/peru/2026/03/05/elecciones-2026-en-medio-de-fake-news-jne-detecta-700-alerta-de-desinformacion/) · [JNE fact checking](https://factchecking.jne.gob.pe/) · [El Comercio: deepfake bill](https://elcomercio.pe/politica/actualidad/elecciones-2026-congresista-carlos-anderson-presenta-proyecto-para-prevenir-la-desinformacion-electoral-y-sancionar-deepfake-noticia/) · [Caretas: youth and AI](https://caretas.pe/sociedad/ia-y-fake-news-en-elecciones-2026-academia-y-expertos-trazan-ruta-contra-la-desinformacion/)
- LatAm: [AppGate Fraud Beat 2026](https://lanotaeconomica.com.co/movidas-empresarial/el-informe-fraud-beat-2026-de-appgate-revela-la-industrializacion-del-fraude-digital-en-latinoamerica/) · [BioCatch: LatAm scams](https://www.biocatch.com/blog/scams-in-latin-america-what-the-data-really-tells-us) · [Contxto: AI fraud LatAm](https://contxto.substack.com/p/ai-driven-frauds-are-growing-in-latin) · [ITSitio: 2026 predictions](https://www.itsitio.com/ch/seguridad/cinco-predicciones-que-marcaran-el-fraude-y-el-acceso-seguro-en-latinoamerica-en-2026/)

> ⚠️ Some numbers come from press or secondary sources. Say "según el Ministerio Público / IPE" in the pitch, and don't present the specialist estimates as official.
