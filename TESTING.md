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


## Functional Testting


## Stability Testting


## Metamorphic Testting


## Using your code as a base for Stability Tests

