# Code Metrics

_Last updated:_ 2025-11-13 — review quarterly to keep these figures relevant.

## Lines of Code Snapshot

All counts exclude generated content (`.next`, `node_modules`) and were gathered with PowerShell scripts (`Get-ChildItem` + `Measure-Object`).

| Area            | Extensions Considered                     | Files | Lines |
|-----------------|--------------------------------------------|------:|------:|
| `src/web`       | `.ts`, `.tsx`, `.js`, `.jsx`, `.css`, `.md` |   120 | 23,246 |
| `lib`           | `.ts`, `.md`                                |    12 | 1,034 |
| `src/analytics` | `.ts`, `.py`                                |     5 |   859 |

**Breakdown for `src/web`:**

| Extension | Files | Lines |
|-----------|------:|------:|
| `.ts`     | 61    | 7,453 |
| `.tsx`    | 24    | 11,082 |
| `.js`     | 32    | 4,529 |
| `.css`    | 1     | 119 |
| `.md`     | 2     | 63 |

## Complexity Signals

Although full cyclomatic metrics were not generated in this pass, file size acts as a practical proxy for maintenance hotspots. Top 10 largest source files in `src/web` by LOC:

| File | LOC |
|------|----:|
| `components/StockChart/StockChart.tsx` | 2,346 |
| `components/Flashcards/FlashcardsContainer.tsx` | 1,816 |
| `components/ChartSection/ChartSection.tsx` | 1,666 |
| `components/DateFolderBrowser/DateFolderBrowser.tsx` | 1,229 |
| `components/Flashcards/hooks/useFlashcardData.ts` | 931 |
| `components/UI/ChartMagnifier.js` | 854 |
| `components/Header/Header.tsx` | 851 |
| `components/Tutorial/Tutorial.tsx` | 742 |
| `components/Auth/AuthModal/index.js` | 468 |
| `components/Features/RoundHistory.js` | 412 |

> **Next step:** Consider running a dedicated complexity tool (e.g. [`complexity-report`](https://www.npmjs.com/package/complexity-report) or [Plato](https://github.com/es-analysis/plato)) against the files above to track cyclomatic and maintainability scores.

## File Size Distribution (`src/web`)

| Size Bucket | File Count |
|-------------|-----------:|
| 0–2 KB      | 54 |
| 2–5 KB      | 29 |
| 5–10 KB     | 26 |
| 10–20 KB    | 12 |
| 20–50 KB    | 4 |
| 50+ KB      | 6 |

Largest artifacts (>50 KB) correspond to the modules listed in the complexity table and merit extra scrutiny during refactors.

## Reproducing Metrics

Run from the repository root (PowerShell):

```powershell
# Lines of code by extension (example for src/web)
$extensions = '.ts','.tsx','.js','.jsx','.css','.md'
Get-ChildItem -Path src\web -Recurse -File |
  Where-Object { $extensions -contains $_.Extension -and $_.FullName -notmatch '\\.next' -and $_.FullName -notmatch 'node_modules' } |
  ForEach-Object {
    $lines = (Get-Content -LiteralPath $_.FullName | Measure-Object -Line).Lines
    [PSCustomObject]@{ Path = $_.FullName; Extension = $_.Extension; Lines = $lines }
  }
```

Adapt the paths to target other packages, and aggregate with `Group-Object` / `Measure-Object` as needed.

---

_Update cadence:_ Refresh this document every quarter (or after major refactors) to keep historical trends accurate.
