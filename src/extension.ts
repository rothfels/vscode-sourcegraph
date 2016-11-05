import {
	getRepoURI,
	getRev,
	isDirectory,
	isFileClean,
	isRevUpstream,
	trimRootPath,
} from "./utils";
import * as vscode from "vscode";

import { copy } from "copy-paste";
// tslint:disable-next-line
const open: (val: string) => any = require("open");

interface Options {
	directory?: string;
	file?: string;
	line?: number;
}

function handle(cb: (val: string) => any, opt?: Options): void {
	getRepoURI().then((uri) => getRev().then((rev) => isRevUpstream(rev).then((isUpstream) => {
		if (!isUpstream) {
			return vscode.window.setStatusBarMessage(`Push revision ${rev.substr(0, 6)} upstream first!`, 2500);
		}

		if (typeof opt === "undefined") {
			cb(`https://sourcegraph.com/${uri}@${rev}`);
		} else {
			if (typeof opt.line === "undefined") {
				// TODO: handle unclean workspace?
				if (opt.file) {
					cb(`https://sourcegraph.com/${uri}@${rev}/-/blob/${opt.file}`);
				} else if (opt.directory) {
					cb(`https://sourcegraph.com/${uri}@${rev}/-/tree/${opt.directory}`);
				} else {
					console.error("unexpected options:", opt);
				}
			} else {
				isFileClean().then((isClean) => {
					if (isClean) {
						cb(`https://sourcegraph.com/${uri}@${rev}/-/blob/${opt.file}#L${opt.line}`);
					} else {
						vscode.window.setStatusBarMessage("Commit your changes and push upstream first!", 2500);
					}
				});
			}
		}
	}))).catch(console.error);
}

function handleLinkForPath(path: string, cb: (val: string) => any): void {
	if (isDirectory(path)) {
		handle(cb, { directory: trimRootPath(path) });
	} else {
		handle(cb, { file: trimRootPath(path) });
	}
}

function handleLinkForCurrentEditorLine(cb: (val: string) => any): void {
	const editor = vscode.window.activeTextEditor;
	if (editor) {
		handle(cb, { file: trimRootPath(editor.document.uri.fsPath), line: editor.selection.active.line + 1 });
	}
}

function handleLinkForRepo(cb: (val: string) => any): void {
	handle(cb);
}

function branchOnCallingContext(args: any[], cb: (val: string) => any): void {
	if (args.length > 0 && args[0] && args[0].fsPath) {
		// jump to path from nav tree context menu.
		handleLinkForPath(args[0].fsPath, cb);
	} else if (vscode.window.activeTextEditor) {
		// jump to line in current editor
		handleLinkForCurrentEditorLine(cb);
	} else {
		// jump to repo
		handleLinkForRepo(cb);
	}
}

function openInSourcegraph(...args: any[]): void {
	branchOnCallingContext(args, open);
}

function copySourcegraphLinkToClipboard(...args: any[]): void {
	branchOnCallingContext(args, (val: string) => {
		vscode.window.setStatusBarMessage("Copied Sourcegraph link!", 1000);
		copy(val);
	});
}

export function activate(context: vscode.ExtensionContext): void {
	context.subscriptions.push(vscode.commands.registerCommand("extension.openInSourcegraph", openInSourcegraph));
	context.subscriptions.push(vscode.commands.registerCommand("extension.copySourcegraphLinkToClipboard", copySourcegraphLinkToClipboard));
}

export function deactivate(): void {
	// noop
}
