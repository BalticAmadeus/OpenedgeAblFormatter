# Issue 420 - Code Truncation Analysis

## Problem Summary
**Input**: 194 characters
**Output**: 46 characters (❌ Truncated!)
**Expected**: 174-176 characters

When formatting an assignment where the `=` operator is at position 30+, the code gets truncated from 194 to 46 characters.

---

## Input Code
```abl
iInstance                     = (IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1, INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1) + 1.
```
- Length: 194 chars
- `=` position: 30 (0-indexed)
- Structure: `variable_name` + `30 spaces` + `=` + ` expression`

## Expected Output
```abl
iInstance = (IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1, INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1) + 1.
```
- Length: 174 chars
- `=` position: 10
- Structure: `variable_name` + ` ` + `=` + ` expression`

---

## Step-by-Step Execution Flow

### 1. Initial State
```
[FormattingEngine.formatText] START - Input length: 194
[FormatterFactory] Formatter order: variableAssignmentFormatting, defaultFormatting, assignFormatting, blockFormatting, usingFormatting, ifFunctionFormatting, expressionFormatting, bodyFormatting, enumFormatting, variableDefinitionFormatting, procedureParameterFormatting, functionParameterFormatting, arrayAccessFormatting, statementFormatting
[FormattingEngine.formatText] Before iterateTree, text length: 194
```

**Tree Traversal**: POST-ORDER (children → parent)
- Process leaf nodes first
- Work up to root
- Each formatter modifies both tree AND text

---

### 2. Expression Formatting (Children First) ✅

#### Step 2.1: comparison_expression
```
Node: comparison_expression
Position: start=35, end=64
Text: " INDEX(Instance.ID, "(") GT 0"
Result: NO CHANGE (already formatted)
Length: 194 chars
```

#### Step 2.2: additive_expression #1
```
Node: additive_expression
Position: start=97, end=124
Text: "INDEX(Instance.ID, "(") + 1"
Result: NO CHANGE
Length: 194 chars
```

#### Step 2.3: additive_expression #2
```
Node: additive_expression
Position: start=126, end=175
Text: "INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(")"
Edit: Added space at beginning
Result: " INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(")"
Length: 194 → 195 chars ⚠️
```
**Note**: Text grew by 1 char, positions shift forward

#### Step 2.4: additive_expression #3
```
Node: additive_expression
Position: start=126, end=180 (positions shifted!)
Text: "INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)"
Edit: Removed leading space
Result: "INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1"
Length: 195 → 194 chars
```

#### Step 2.5: ternary_expression (IF function)
```
Node: ternary_expression
Position: start=33, end=188
Text: "IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1, INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1"
Edit: Added space at beginning
Result: " IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1, INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1"
Length: 194 → 195 chars
```

#### Step 2.6: parenthesized_expression
```
Node: parenthesized_expression
Position: start=31, end=190
Text: " (IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1, INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1) "
Edit: Removed trailing space after )
Result: " (IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1, INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1)"
Length: 195 → 194 chars
```

---

### 3. 🔴 THE CORRUPTION HAPPENS HERE

```
Node: additive_expression (top-level expression)
Position: start=31, end=193
Text: " (IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1, INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1) + 1"
Input length: 162 chars

❌ FORMATTER GENERATED CORRUPTED EDIT:
startIndex=31, oldEndIndex=193, newText=" (IF INDEX(Instance.ID, "(") G + 1"
Output length: 34 chars (should be 162 chars!)

TRUNCATION: 162 → 34 chars (lost 128 chars!)
```

**What Happened**:
- The expression formatter tried to process the entire top-level expression
- Due to tree position corruption from previous edits, it read wrong positions
- Generated a truncated newText (only first 34 chars)
- Applied this truncated text to the full range (31-193)
- **Result**: 194 → 66 chars

**Tree/Text Mismatch**:
```
Tree positions: start=31, end=193 (162 chars)
Actual text at those positions: 162 chars
Formatter output: 34 chars ❌

The formatter couldn't read the full text correctly because:
1. Tree positions were corrupted by previous edits
2. insertChangeIntoTree() updates tree positions
3. insertChangeIntoFullText() updates text content
4. BUT: Tree positions can become out of sync with actual text positions
```

---

### 4. Assignment Formatting (Final Blow)

```
Node: assignment
Position: start=0, end=65
Text: "iInstance                     = (IF INDEX(Instance.ID, "(") GT 0 "
Note: Text already truncated to 66 chars (was 194)

Edit: Remove extra spaces before =
Result: "iInstance = (IF INDEX(Instance.ID, "(") G + 1"
Length: 66 → 46 chars

Final result: 46 chars ❌
```

---

## Root Cause Analysis

### The Problem
**POST-ORDER traversal with tree modification causes position corruption**

1. **Tree and Text are modified independently**:
   - `insertChangeIntoTree(tree, edit)` - updates tree node positions
   - `insertChangeIntoFullText(fullText, edit)` - updates text content

2. **Position Corruption Chain**:
   ```
   Edit 1: positions 126-175 → 126-176 (+1)
   Edit 2: positions 126-180 → 126-179 (-1)
   Edit 3: positions 33-188 → 33-189 (+1)
   Edit 4: positions 31-190 → 31-189 (-1)
   Edit 5: positions 31-193 → 31-65 ❌ CORRUPTION!
   ```

3. **Why Position 31 is Critical**:
   - Assignment `=` at position 30
   - Expression starts at position 31
   - When `=` is at position 30+, expression starts at 31+
   - Tree position corruption affects nodes starting at position 31+
   - Formatter reads wrong text → generates truncated output

### The Mechanism
```typescript
// Expression formatter tries to read text
const text = fullText.text.substring(node.startIndex, node.endIndex);
// BUT: node.startIndex and node.endIndex are corrupted
// Returns incomplete text → formatter generates truncated output
```

---

## Key Insights

### Why Only Assignments with `=` at Position 30+?
1. Normal assignments (e.g., `var = value`):
   - `=` at position ~5-10
   - Expressions start at position ~7-12
   - Tree corruption doesn't affect early positions
   - Formatting works fine ✅

2. Long assignments (issue 420):
   - `=` at position 30+
   - Expression starts at position 31+
   - Tree corruption DOES affect positions 31+
   - Formatting breaks ❌

### POST-ORDER Traversal Problem
```
Order of processing:
1. comparison_expression (start=35) ✅
2. additive_expression (start=97) ✅
3. additive_expression (start=126) ✅ but shifts positions
4. additive_expression (start=126) ✅ but shifts positions
5. ternary_expression (start=33) ✅ but shifts positions
6. parenthesized_expression (start=31) ✅ but shifts positions
7. additive_expression (start=31) ❌ CORRUPTED - positions out of sync
8. assignment (start=0) ❌ Inherits corrupted text
```

**The Pattern**: 
- Each edit at position >30 shifts subsequent positions
- By the time we reach the top-level expression, positions are wrong
- Formatter reads wrong text → generates truncated output

---

## Attempted Solutions

### ❌ Solution 1: PRE-ORDER Processing
**Idea**: Format assignment BEFORE descendants to avoid corruption
- Process assignment first
- Then process expressions
- **Failed**: PRE-ORDER corrupted descendant positions even worse

### ❌ Solution 2: Re-parse Tree During Iteration
**Idea**: Re-parse tree after each edit to fix positions
- Format assignment
- Re-parse tree
- Continue with descendants
- **Failed**: Memory access violations (tree-sitter doesn't support this)

### ❌ Solution 3: Move `=` to New Line
**Idea**: Temporarily move `=` to new line, then format
- Preprocess: move `=` to new line
- Format normally
- Assignment formatter puts it back on one line
- **Failed**: Broke 24 other tests

### ⚠️ Solution 4: Skip Expression Formatting
**Idea**: Skip formatting expressions when `=` at position 30+
- Detect assignments with `=` at 30+
- Skip formatting their expression descendants
- **Partially works**: Issue 420 outputs 174 chars ✅
- **Problem**: Skips too many nodes, breaks 14 other tests

---

## The Real Question

**Why does the formatter generate truncated text?**

Looking at the critical step:
```
[FormattingEngine.parse] Node type: additive_expression
[FormattingEngine.parse] Position: start=31, end=193
[FormattingEngine.parse] fullText length before parse: 194
[FormattingEngine.parse] Formatter generated edit: newText=" (IF INDEX(Instance.ID, "(") G + 1"
```

The formatter:
1. Receives node at positions 31-193 (162 chars)
2. Reads fullText of length 194
3. **Generates only 34 chars** instead of 162 chars
4. **Lost 128 chars** in the process

**Theory**: The tree node positions (31-193) don't match the actual text positions due to previous edits. When the formatter tries to read `node.text`, it gets corrupted text.

---

## Next Steps

### Investigation Needed
1. **Add logging to expression formatter**:
   - What text does it receive?
   - What positions does it use?
   - Why does it generate truncated output?

2. **Check tree-sitter node.text property**:
   - Does `node.text` use tree positions or actual text positions?
   - Is `node.text` cached or computed on-the-fly?

3. **Verify insertChangeIntoTree implementation**:
   - Does it correctly update all descendant positions?
   - Are there edge cases around position 31?

### Potential Solutions
1. **Don't modify tree during iteration**:
   - Collect all edits first
   - Apply them all at once after iteration
   - **Con**: User reported 20x slower

2. **Fix expression formatter**:
   - Make it more resilient to position corruption
   - Use fullText.text directly instead of node.text
   - Validate positions before generating output

3. **Detect and skip only corrupted nodes**:
   - Check if node.text matches expected length
   - Skip formatting only if corruption detected
   - Allow normal formatting for non-corrupted nodes

---

## Summary

**The Bug**: POST-ORDER tree traversal with simultaneous tree/text modification causes position corruption for nodes starting at position 31+, leading to truncated formatter output.

**Critical Position**: 31 (expression starts right after `=` at position 30)

**Affected Code**: Assignments with `=` at position 30 or later

**Current Status**: ❌ No working solution yet (all attempts have failed or broken other tests)
