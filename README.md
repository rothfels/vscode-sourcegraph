# vscode-sourcegraph

Jump to Sourcegraph directly from VS Code!

## Features

**Command**

In the command pallet, type `Open in Sourcegraph`.

![open](images/open-in-browser.png?raw=true "Open in browser function")

In the command pallet, type `Copy Sourcegraph link to clipboard`.

![copy](images/copy-to-clipboard.png?raw=true "Copy link to clipboard function")

**Keybord shortcut**

 Press <kbd>Ctrl+S</kbd> to open in browser.
 Press <kbd>Ctrl+Shift+S</kbd> to copy to clipboard.

**Context menu**

Right click on an explorer item and choose `Open in Sourcegraph` or `Copy Sourcegraph link to clipboard`.

![context](images/context-menu.png?raw=true "Context menu options")

## Requirements

Your code must be hosted on GitHub.com. If your repository is private, create an account on
[Sourcegraph.com](https://sourcegraph.com) and provide Sourcegraph OAuth scope to view your private
repositories.

Linking to a line on Sourcegraph.com requires a non-dirty buffer and the `HEAD` revision must be
pushed upstream.

## Known Issues

Linking will not work properly if your working directory is in a deatched `HEAD` state.

## Release Notes

### 1.0.0

Initial release

## Development

### Make changes
* press `F5` to open a new window with your extension loaded
* relaunch the extension from the debug toolbar after changing code in `src/extension.ts`, or using `F5`
* reload (`Ctrl+R` or `Cmd+R` on Mac) the VS Code window with your extension to load your changes

### Run tests
* open the debug viewlet (`Ctrl+Shift+D` or `Cmd+Shift+D` on Mac) and from the launch configuration dropdown pick `Launch Tests`
* press `F5` to run the tests in a new window with your extension loaded
* see the output of the test result in the debug console
* make changes to `test/extension.test.ts` or create new test files inside the `test` folder
    * by convention, the test runner will only consider files matching the name pattern `**.test.ts`