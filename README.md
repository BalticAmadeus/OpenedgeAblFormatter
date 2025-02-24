# ![OpenEdge ABL Formatter Logo](./resources/Formatter_LOGO_32x32.png) OpenEdge ABL Formatter [![Node.js CI](https://github.com/BalticAmadeus/AblFormatter/actions/workflows/main.yml/badge.svg?branch=develop)](https://github.com/BalticAmadeus/AblFormatter/actions/workflows/main.yml)


VSCode extension for Progress OpenEdge code formatting.

This extension uses [**tree-sitter-abl**](https://github.com/usagi-coffee/tree-sitter-abl) implementation by Kamil Jakubus.

## Current status

The OpenEdge ABL Formatter is now available in the VS Code Extension Marketplace.

![Formatter in action](./resources/Formatter_in_action.gif)

## Features

At the moment we implemented formatting logic for these language features:

- Assign
- block
- body
- case
- enum
- find
- for
- functionParameter
- if
- ifFunction
- procedureParameter
- property
- tempTable
- using
- variableDefinition

## Configuration

We implemented extensive settings configuration to allow users to easly tailor the experience to their needs. This might not be the case in the future.

### Settings 

| Property Name                             | Type    | Default     | Enum                        | Description                                                                                                   |
|-------------------------------------------|---------|-------------|-----------------------------|---------------------------------------------------------------------------------------------------------------|
| assign formatting                         | boolean | true        | –                           | Enable/disable ASSIGN statement formatting.                                                                   |
| assign formatting assign location         | string  | New         | New, Same                   | Should assigns be located on a new line or the same line as the ASSIGN keyword?                                |
| assign formatting align right expression  | string  | Yes         | Yes, No                     | Should right expression be aligned by longest one?                                                          |
| assign formatting end dot location        | string  | New aligned | New, New aligned, Same      | Should end dot be located on a new line or the same line as the ASSIGN keyword?                                |
| find formatting                           | boolean | true        | –                           | Enable FIND formatting                                                                                        |
| for formatting                            | boolean | true        | –                           | Enable FOR formatting                                                                                         |
| case formatting                           | boolean | true        | –                           | Enable CASE formatting                                                                                        |
| case formatting then location             | string  | Same        | New, Same                   | Should THEN clause be on a new line or the same line as the CASE keyword?                                       |
| case formatting do location               | string  | Same        | New, Same                   | Should DO block be on a new line or the same line as the THEN keyword?                                          |
| case formatting statement location        | string  | New         | New, Same                   | Should the first statement in a WHEN block be on a new line or the same line?                                   |
| block formatting                          | boolean | true        | –                           | Enable block formatting                                                                                       |
| if formatting                             | boolean | true        | –                           | Enable IF formatting                                                                                          |
| if formatting then location               | string  | Same        | New, Same                   | Should THEN clause be on a new line or the same line as the IF keyword?                                          |
| if formatting do location                 | string  | Same        | New, Same                   | Should DO block be on a new line or the same line as the THEN keyword?                                          |
| if formatting statement location          | string  | Same        | New, Same                   | Should the first statement in an IF block be on a new line or the same line?                                    |
| temptable formatting                      | boolean | true        | –                           | Enable TEMP-TABLE formatting                                                                                  |
| using formatting                          | boolean | true        | –                           | Enable USING formatting                                                                                       |
| body formatting                           | boolean | true        | –                           | Enable BODY formatting                                                                                        |
| property formatting                       | boolean | true        | –                           | Enable property formatting                                                                                    |
| if function formatting                    | boolean | true        | –                           | Enable IF FUNCTION formatting                                                                                 |
| if function formatting add parentheses    | string  | No          | Yes, No                     | Add parentheses around the expression?                                                                        |
| if function formatting else location      | string  | Same        | New, Same                   | Should ELSE clause be on a new line or the same line as the IF FUNCTION keyword?                                |
| enum formatting                           | boolean | true        | –                           | Enable ENUM formatting                                                                                        |
| enum formatting end dot location          | string  | Same        | New, Same                   | –                                                                                                             |
| variable definition formatting            | boolean | true        | –                           | Enable DEFINE VARIABLE formatting                                                                             |
| procedure parameter formatting            | boolean | true        | –                           | Enable PROCEDURE PARAMETER formatting                                                                         |
| function parameter formatting             | boolean | true        | –                           | Enable FUNCTION PARAMETER formatting                                                                          |
| function parameter formatting align parameter types | string  | Yes         | Yes, No                     | Align parameter types?                                                                                          |
| array access formatting                   | boolean | true        | –                           | Enable ARRAY ACCESS formatting                                                                                |
| array access formatting add space after comma | string  | Yes         | Yes, No                     | Add space after comma?                                                                                          |
| expression formatting                     | boolean | true        | –                           | Enable EXPRESSION formatting                                                                                  |
| expression formatting logical location    | string  | New         | New, Same                   | Should logical operators be on a new line or the same line as the expression?                                  |
| statement formatting                      | boolean | true        | –                           | Enable STATEMENT formatting                                                                                   |
| show tree info on hover                   | boolean | true        | –                           | Enable table view with tree info on hover                                                                     |


### Formatting on save

TODO: link a separate file with settings



## Installation

Download the extension **vsix** file from GitHub repository and install it on your machine.

[How to install from **vsix**?](https://code.visualstudio.com/docs/editor/extension-marketplace#_install-from-a-vsix)

## Usage

Alowed file extensions:

- **.p**
- **.cls**
- **.i**
- **.w**

Commands:

- **Format Document**: Formats the entire ABL document.
- **Format Selection**: Formats only the selected lines of code.

## Debuging

- TODO: describe how to deal with debug mode

## Contributing

### Registering formatter issues

- TODO: create issue template

### Fixing yourself

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Commit your changes and push to your branch.
4. Submit a pull request to the main repository.

## License

This project is licensed under the APACHE 2.0 License - see the LICENSE file for details.
