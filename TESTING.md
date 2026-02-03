# Testing

## Testing Summary

| ID  | Testing method                                      | Purpose                                                                   | Script name                   | Files used                     | Exclude list                                      | On commit workflow | Nightly workflow  |
| --- | --------------------------------------------------- |-------------------------------------------------------------------------- | ----------------------------- | ------------------------------ | ------------------------------------------------- | ------------------ | ----------------- |
| 1   | Functional Tests                                    | To test specific formatting features                                      | Extension Tests               | `functionalTests`              |  no                                               | yes                | no                |
| 1.1 | Functional Tests -> Github Issues                   | To add issues from Github as failing until they are fixed                 | Extension Tests               | `functionalTests/issuesHithub` | `functionalTests/_failures.txt`                   | yes                | no                |
| 2.1 | Stability Tests -> Symbol Tests                     | To test if non-empty symbols are preserved after formatting               | Symbol Tests                  | `ade`                          | `stabilityTests/_symbol_failures.txt`             | yes                | yes               |
| 2.2 | Stability Tests -> AST Tests                        | To test if the tree structure of a file is the same after formatting      | AST Tests                     | `ade`                          | `stabilityTests/_ast_failures.txt`                | yes                | yes               |
| 2.3 | Stability Tests -> Compilation Tests                | To test if the code compiles after formatting                             | Compilation Tests             | `ade-sosourceCode`             | `compilationTests/_failures.txt`                  | no                 | no                |
| 3.1 | Metamorphic Tests -> Functional                     | To run a set of metamorphic relations on top of existing Functional Tests | Extension Tests (Metamorphic) | `functionalTests`              | no (but skips failing Functional Tests)           | no                 | no                |
| 3.2 | Metamorphic Tests -> AST                            | To run a set of metamorphic relations on top of existing AST Tests        | AST Tests (Metamorphic)       | `ade`                          | no (but skips failing AST Tests)                  | no                 | no                |

## Functional Testing

The aim of functional testing is to cover as many as possble specific functionalities with simpliest possible test cases. Tests are grouped by formatter feature they are testing (e.g 'for'). Tests contain predefined inputs and expected results. The default settings are taken from `functionalTests/settings.json`. There is an additional folder (`functionalTests/issuesHithub`), where github issues are added mainly for the purpose of increasing the tests library. Until they are fixed, they should be added into `functionalTests/_failures.txt` file.

## Stability Testing

Stability testing is an additional method to monitor the increase or decrease of quality of the Formartter. This approach tests meta properties of the Formatter, namely:
 1. __Symbol__ - Does the Formatter only touch white spaces (including tabs, new lines), and does not change the count of other symbols in the file after formatting?
 2. __AST__ - Does the Formatter keep the structure of the AST?
 3. __Compilation__ - Do files which we know compiled previosly, do so after formatting?

This testing method requires code files as input. For that we mainly use __ADE__ repository which has ~4700 OpenEdge files. Compilation testing uses a subset of ADE repository, as not all files in the `ADE` can be easly compiled.

## Metamorphic Testing

Metamorphic Testing takes testing to the new dimension by adding additionl test cases on top of existing ones. Metamorphic Relation (MR) is a pair of functions which describe how the input and output of original test case has to be changed for test case to pass (or fail). E.g. in OpenEdge we know that by replacing all `EQ` keywords to `=` the code logic and structure will not change. So Metamorphic Testing allows us to apply this change to previously created test cases. Currently we added Metamorphic Testing to Functional and AST tests, so in total every MR is applied to more than a 5,000 files.

<img width="944" height="496" alt="testing" src="https://github.com/user-attachments/assets/ce3ace45-7453-43b3-95df-b0c1b6668028" />

## Using your code as input for Stability Tests

