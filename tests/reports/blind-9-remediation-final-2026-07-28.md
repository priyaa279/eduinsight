# EduInsight Blind Set #9 remediation — final local verification

Date: 2026-07-28  
Status: verified locally; not published; Blind Set #10 not created

## Immutable untouched baseline

Blind Set #9 remains preserved exactly as first executed:

- Overall: **154/220 (70%)**
- Wrong high-confidence answers: **39**
- Silent filter drops: **16**
- Privacy failures: **2**
- Crashes: **0**
- Suite bundle SHA-256: `c6f1cfa7fb05006911945e55618d96537697695c8e0a32d17936065067620e2a`
- Suite file SHA-256: `43617aea80a4cfc1e98868b05873c019008d7700c96949bad2f68f6d0952fffb`
- Oracle wrapper SHA-256: `acffcd4b85cc4385b6324646fc52fb8a6f2b43546709b551130f459c75a71601`
- Seal SHA-256: `3e2e5bf3e0c95047822ce94508cf8c0e3ee112730245320341d5bdcf03d4ebc6`
- First-run report SHA-256: `41feb6c7e2fbc4d63b56e29d97028346e78a597cff19d1cd2175c91ca9e7d18b`
- Frozen boundary bundle SHA-256: `6dcf4f77a1ab9048d9ce3cbc9de354a10c0aaece22526c50fa7221e4e034a85f`

The untouched suite, oracle, seal, preflight, evaluation runner, and first-run report were not edited during remediation. The Blind #9 regression runner verifies the preserved hashes before testing the current engine.

## Blind #9 post-remediation regression

- Raw original-contract result: **190/220 (86.4%)**
- Adjudicated regression result: **220/220 (100%)**
- Privacy refusals: **10/10**
- Remaining wrong high-confidence defects: **0**
- Remaining silent filter drops: **0**
- Remaining privacy leaks: **0**
- Remaining crashes: **0**

The raw/adjudicated difference is limited to documented semantic or presentation equivalents. No adjudication waives privacy, metric selection, arithmetic, filter conservation, date handling, source integrity, or provenance.

## Complete known release bank

Command: `npm run test:ask-release`

- Result: **2,113/2,113 adjudicated checks passed**
- Known evaluation: **184/184**
- Blind #1 regression: **100/100**
- Blind #2 regression: **180/180**
- Blind #3 adjudicated regression: **250/250**
- Blind #4 adjudicated regression: **285/285**
- Blind #5 adjudicated regression: **280/280**
- Blind #6 adjudicated regression: **260/260**
- Blind #7 adjudicated regression: **250/250**
- Blind #9 adjudicated regression: **220/220**
- Semantic-plan tests: **10/10**
- Semantic-parser boundary tests: **5/5**
- No-API local-contract tests: **14/14**
- Planner/presentation tests: **3/3**
- Adversarial tests: **25/25**
- Systemic tests: **47/47**

## Browser critical flows

The local application at `http://localhost:3000/` passed **7/7** end-to-end browser flows:

1. Supported capacity calculation rendered with validated provenance.
2. Ambiguous language produced a clarification and no assumed result.
3. Unsupported faculty data produced a governed limitation and no unrelated chart.
4. A student-level privacy request was refused without disclosure.
5. An unsupported demographic cross-tabulation failed closed.
6. The common academic shorthand `CS` resolved in a complete compact request.
7. Program, residency, and year constraints were all retained and displayed for a supported combined-filter request.

Browser console errors: **0**

## Build, rendered UI, and lint

- `npm run build`: passed
- `npm test`: passed, including server-rendered workspace validation
- `npm run lint`: passed with **0 errors** and 12 pre-existing unused-variable warnings

## Release decision

All known and adjudicated requirements are green after systemic Blind #9 remediation. This verifies the current local regression bank; it does not replace the immutable untouched first-run result and is not evidence from a new unseen blind set.

Per instruction:

- no publication was performed;
- Blind Set #10 was not created;
- the project remains local and uses no external language-model API.
