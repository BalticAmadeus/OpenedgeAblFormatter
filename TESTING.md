# Testing

## Testing Summary

| Testing Method                     | Purpose                               | Script Name                   | Files Used                     | Exclude List                          | CI              |
| ---------------------------------- | ------------------------------------- | ----------------------------- | ------------------------------ | ------------------------------------- | --------------- |
| **1. Functional Tests**            | Validate specific formatting features | Extension Tests               | `functionalTests`              | No                                    | Commit          |
| **1.1 Functional → GitHub Issues** | Track known GitHub issues             | Extension Tests               | `functionalTests/issuesGithub` | `functionalTests/_failures.txt`       | Commit          |
| **2.1 Stability → Symbol**         | Preserve non-whitespace symbols       | Symbol Tests                  | `ade`                          | `stabilityTests/_symbol_failures.txt` | Commit, Nightly |
| **2.2 Stability → AST**            | Preserve AST structure                | AST Tests                     | `ade`                          | `stabilityTests/_ast_failures.txt`    | Commit, Nightly |
| **2.3 Stability → Compilation**    | Ensure code compiles after formatting | Compilation Tests             | `ade-sosourceCode`             | `compilationTests/_failures.txt`      | No CI           |
| **3.1 Metamorphic → Functional**   | Apply MRs to Functional Tests         | Extension Tests (Metamorphic) | `functionalTests`              | No (skips failing tests)              | No CI           |
| **3.2 Metamorphic → AST**          | Apply MRs to AST Tests                | AST Tests (Metamorphic)       | `ade`                          | No (skips failing tests)              | No CI           |




## Functional Testing

The goal of Functional Testing is to cover as many formatter features as possible using the simplest test cases. Tests are grouped by the formatter feature they validate (e.g. 'for'). Each test includes predefined input and expected output. Default formatter settings are defined in `functionalTests/settings.json`. An additional folder, `functionalTests/issuesGithub`, contains test cases derived from reported GitHub issues. These tests are intentionally marked as failing until the issues are fixed and must be listed in `functionalTests/_failures.txt`.

## Stability Testing

Stability Testing monitors changes in formatter quality over time by validating its core invariants. It focuses on the following properties:
 1. __Symbol__ - Ensures the formatter only modifies whitespace (spaces, tabs, newlines) and does not change the count of non-whitespace symbols.
 2. __AST__ - Ensures the abstract syntax tree (AST) structure remains unchanged after formatting.
 3. __Compilation__ - Ensures that code known to compile before formatting still compiles afterward.

These tests require real-world code as input. The primary source is the __ADE__ repository, which contains approximately 4,700 OpenEdge files. Compilation testing uses only a subset of ADE, as not all files can be compiled easily.

## Metamorphic Testing

Metamorphic Testing takes testing to the new dimension by adding additional test cases on top of existing ones. __Metamorphic Relation (MR)__ is a pair of functions which describe how the input and output of original test case has to be changed for test case to pass (or fail). E.g. in OpenEdge we know that by replacing all `EQ` keywords to `=` the code logic and structure will not change. So Metamorphic Testing allows us to apply this change to previously created test cases. Currently we added Metamorphic Testing to Functional and AST tests, so in total every MR is applied to more than a 5,000 files.

<img width="944" height="496" alt="testing" src="https://github.com/user-attachments/assets/ce3ace45-7453-43b3-95df-b0c1b6668028" />

## Using your code as input for Stability Tests

You can replace ADE repository files with your own OpenEdge code to run Stability Tests. At the moment, Symbol and AST tests are straightforward to run. Compilation testing requires additional setup and depends on your build environment.

### Setup Steps

1. Set up the development environment ([It is simple, see instruction here](https://github.com/BalticAmadeus/OpenedgeAblFormatter/blob/develop/CONTRIBUTING.md)).
2. Checkout or copy your code into `resources/ade` directory.
3. Clear `resources/stabilityTests/_symbol_failures.txt` and `resources/stabilityTests/_ast_failures.txt` exclude files as they contain code files for ADE repository.
4. Run `Symbol Tests` and `AST Tests` scripts
5. After completion, any detected failures will be written to `resources/stabilityTests/_ast_failures.txt` and `resources/stabilityTests/_ast_failures.txt` respectively.

### Usage Scenarios

This process can be used in two main ways:
1. __Regression and Stability Monitoring.__ Detect newly introduced issues or confirm previously failing cases have been resolved.
2. __Issue Discovery and Analysis.__ While Stability Tests won’t catch every formatting issue, failures are almost always true positives. Inspecting failing files typically reveals genuine formatter problems.
