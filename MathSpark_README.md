# 🧮 MathSpark

> Instant randomised math practice — one tap, ten fresh problems.

---

## Overview

MathSpark generates a new set of 10 randomised math problems on demand. It's designed for quick mental arithmetic practice, targeting addition, subtraction, multiplication, and chained expressions — all at a controlled difficulty level.

---

## Problem Generation Rules

Each problem is randomly picked from one of these **8 types**:

| Type | Format | Example |
|------|--------|---------|
| Addition | `A + B = ?` | `25 + 57 = ?` |
| Subtraction | `A - B = ?` | `742 - 568 = ?` |
| Multiplication | `A × B = ?` | `3 × 5 = ?` |
| Chained (mul first) | `A × B + C = ?` | `3 × 3 + 198 = ?` |
| Chained (add first) | `A + B × C = ?` | `11 + 3 × 5 = ?` |
| Blank addition | `A + _ = T` | `152 + _ = 241` |
| Blank subtraction | `A - _ = R` | `654 - _ = 212` |
| Blank multiplication | `A × _ = R` | `4 × _ = 20` |

---

## Constraints (the formula)

```
ADDITION / SUBTRACTION
  A, B  → 10–499 (max 3 digits each)
  Total → never exceeds 1000
  Result of subtraction → never negative

MULTIPLICATION
  A, B  → 2–5  (multipliers capped at 5)

CHAINED  (e.g. 3 × 5 + 124)
  Multiplication part follows multiplication rules above
  Addition part → 10–200
  Total → never exceeds 1000

BLANK PROBLEMS
  The missing value (_) is the randomly generated operand
  The total/result is shown instead
  All same numeric constraints as above apply
```

---

## Button Logic (pseudocode)

```js
function generateProblems() {
  const types = [
    'add', 'sub', 'mul',
    'chain_add_mul', 'chain_mul_add',
    'blank_add', 'blank_sub', 'blank_mul'
  ]

  const problems = []

  while (problems.length < 10) {
    const type = randomChoice(types)
    const problem = tryGenerate(type)   // returns null if constraints not met
    if (problem) problems.push(problem)
  }

  return problems  // array of { question, answer }
}
```

Each `tryGenerate(type)` call:
1. Picks random numbers within the allowed ranges
2. Computes the result
3. **Validates** all constraints (total ≤ 1000, no negatives, etc.)
4. Returns `{ question, answer }` or `null` (loop retries on null)

---

## Problem Object Shape

```json
{
  "question": "3 × 3 + 198 = ?",
  "answer": 207,
  "type": "chain_add_mul"
}
```

---

## Extending the App

- ➕ Add **difficulty levels** by adjusting number ranges
- ➗ Add **division** by introducing a `div` type (keep results whole numbers)
- ⏱️ Add a **timer mode** to answer all 10 within X seconds
- 📊 Track **score history** per session
- 🔢 Allow users to **set how many problems** appear per round

---

## Tech Suggestions

| Use case | Stack |
|----------|-------|
| Web app | Next.js + Tailwind (your usual stack!) |
| Mobile | React Native or PWA |
| State | Simple `useState` — no backend needed |
| Storage | `localStorage` for score history |

---

*Built with MathSpark — because mental maths should be fun.*
