# AblFormatter

VSCode extension for Progress OpenEdge code formatting.

This extension uses [**tree-sitter-abl**](https://github.com/usagi-coffee/tree-sitter-abl) implementation by Kamil Jakubus.

## Current status

This is an early preview. Currently, the formatter is not ready for the public release. You can only download it here and install from **vsix** file.

**Planned release date: 2025-01**

TODO: Add gif here

## Features

At the moment we implemented formatting logic for these language features:

- Assign
- block
- body
- case
- define
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

### Extension Settings 

TODO: list of extension settings
TODO: link to a separate settings documentation

### VSCode Settings

TODO

### Formatting On Save

> In case you want to use formatting on save

VSCode provides default `editor.formatOnSaveMode` which enables file formatting on save using configured formatter.

### Formatting On Save With Alternate Settings

> In case you want to use formatting on save, but with less features enabled, you can use `AblFormatter.formatOnSave` setting

If `AblFormatter.formatOnSave` is set, then durring save current file is formatted using `./ablformatter/settings.json` file which structure folows the same logic as VSCode settings file. The only difference is that these settings are explicit e.g. if setting is not writen, the formatter presumes that the value is false. File example:

```
{
    "AblFormatter.usingFormatting": true,
    "AblFormatter.variableDefinitionFormatting": true
}
```
In this case only two explicitly enabled formatters will be enabled.

### Diferent Settings For File
> In case you need specific settings for 1 file

There is a possiblity to have specific formatter settings for a given file. This was implemented for simplier functional testing, but can be used by end users too. It works by writing OpenEdge comments on the top of the file. The first comment should be `/* formatterSettingsOverride */`. The second should contain settings json content. Example:

```
/* formatterSettingsOverride */
/*  { "AblFormatter.blockFormatting": true,
"AblFormatter.forFormatting": true
}*/

for each Customer:
    Customer.var += 1.
end.
```

Contrary to [On save](#formatting-on-save-with-alternate-settings) settings, File settings are implicit and just overrides VSCode settings.

Priority:

1. File Settings
2. VSCode Settings

## Installation

Download the extension **vsix** file from GitHub repository and install it on your machine.

[How to install from **vsix**?](https://code.visualstudio.com/docs/editor/extension-marketplace#_install-from-a-vsix)

## Usage

Alowed file extensions:

- **.p**
- **.cls**
- **.i**
- **.w**

Standard VSCode Commands:

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
