# False-alarm notes: local developer demonstration

Recorded 2026-10-21 using the actual Vigía React Native components through Expo web. The product intentionally has no web app: its web-root guard was bypassed temporarily for this developer preview and restored before committing. Sensor readings and GPS were synthetic; the alert used the existing built-in rehearsal. The real API ran in local Wrangler with local D1 and the committed Atomic Memory HTTP test fixture. No WhatsApp/SMS, live cloud account, native Android or iPhone was exercised.

The video starts at the real false-alarm PIN confirmation, then shows explicit note save, correction and confirmed forgetting. The final provider fixture count is zero. These are short user-authored notes stored verbatim, not automatic summaries or evidence. The feature never affects detection, alert escalation or contacts. Every frame carries the fixture/platform disclosure.

Validation: 229 tests pass (67 detector, 82 API, 80 mobile); all three workspace TypeScript checks pass, including a fresh check after restoring the web guard. An independent API run passes all 24 memory tests. Local D1 migrations through 0008 applied successfully. Native device sensors, background behavior, camera and real messaging were not verified.

To reproduce the HTTP contract without a cloud key, run the API memory tests in apps/api/test/memoria.test.ts and its test/fixtures/atomic-memory-falso.ts fixture. For a developer UI preview only, use the existing built-in alert rehearsal, local Wrangler API, synthetic browser sensor/location inputs and the temporary web guard bypass described above. Do not deploy this bypass. Production memory remains off unless server-only ATOMIC_MEMORY_URL and ATOMIC_MEMORY_API_KEY are configured.
