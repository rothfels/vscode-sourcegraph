import { exec, spawn } from "child_process";
import * as fs from "fs";
import * as vscode from "vscode";

export function getGitPath(): Promise<string> {
	return new Promise((resolve, reject) => {
		const gitPath = <string> vscode.workspace.getConfiguration("git").get("path");
		if (typeof gitPath === "string" && gitPath.length > 0) {
			resolve(gitPath);
		}

		if (process.platform !== "win32") {
			// Default: search in PATH environment variable
			resolve("git");
		} else {
			// in Git for Windows, the recommendation is not to put git into the PATH.
			// Instead, there is an entry in the Registry.
			// see: https://github.com/DonJayamanne/gitHistoryVSCode/blob/cdf4c03ccb5fd0efcc66b04e8ab7f25e533c2f32/src/helpers/historyUtils.ts#L20

			let regQueryInstallPath: (location: string, view: string) => Promise<string> = (location, view) => {
				return new Promise((resolve2, reject2) => {
					const cb = function(error: Error & {code: number, stdout: string, stderr: string}, stdout: string, stderr: string): void {
						if (error && error.code !== 0) {
							error.stdout = stdout.toString();
							error.stderr = stderr.toString();
							reject2(error);
							return;
						}

						const installPath = stdout.toString().match(/InstallPath\s+REG_SZ\s+([^\r\n]+)\s*\r?\n/i)[1];
						if (installPath) {
							resolve2(installPath + "\\bin\\git");
						} else {
							reject2();
						}
					};

					let viewArg = "";
					switch (view) {
						case "64": viewArg = "/reg:64"; break;
						case "32": viewArg = "/reg:64"; break;
						default: break;
					}

					exec("reg query " + location + " " + viewArg, cb);
				});
			};

			let queryChained: (locations: { key: string, view: string }[]) => Promise<string> = (locations) => {
				return new Promise<string>((resolve2, reject2) => {
					if (locations.length === 0) {
						reject2("None of the known git Registry keys were found");
						return;
					}

					let location = locations[0];
					regQueryInstallPath(location.key, location.view).then(
						resolve2, //(location) => resolve2(location),
						(error) => queryChained(locations.slice(1)).then(
							resolve2, //(location) => resolve2(location),
							reject2 //(error) => reject2(error)
						)
					);
				});
			};

			queryChained([
				{ "key": "HKCU\\SOFTWARE\\GitForWindows", "view": null },   // user keys have precendence over
				{ "key": "HKLM\\SOFTWARE\\GitForWindows", "view": null },   // machine keys
				{ "key": "HKCU\\SOFTWARE\\GitForWindows", "view": "64" },   // default view (null) before 64bit view
				{ "key": "HKLM\\SOFTWARE\\GitForWindows", "view": "64" },
				{ "key": "HKCU\\SOFTWARE\\GitForWindows", "view": "32" },   // last is 32bit view, which will only be checked
				{ "key": "HKLM\\SOFTWARE\\GitForWindows", "view": "32" },   // for a 32bit git installation on 64bit Windows
			]).then((path) => resolve(path), (error) => resolve("git"));
		}
	});
}

export function execGitCommand(rootDir: string, cmd: string, args: string[]): Promise<string> {
	return getGitPath().then(gitExecutable => {
		return new Promise<string>((resolve, reject) => {
			const options = { cwd: rootDir };
			const ls = spawn(gitExecutable, [cmd, ...args], options);

			let error = "";
			let output = "";
			ls.stdout.setEncoding("utf8");
			ls.stdout.on("data", (data: string) => {
				output += data;
			});

			ls.stderr.setEncoding("utf8");
			ls.stderr.on("data", (data: string) => {
				error += data;
			});

			ls.on("exit", function(code: number): void {
				if (error.length > 0) {
					reject(error);
					return;
				}

				resolve(output);
			});
		});
	});
}

export function getRepoURI(): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		execGitCommand(vscode.workspace.rootPath, "config", ["--get", "remote.origin.url"])
			.then((url) => {
				url = url.trim();

				if (url.indexOf("https://github.com") === 0) {
					url = url.substr("https://".length);
					if (url.endsWith(".git")) {
						url = url.substr(0, url.length - ".git".length);
					}
					resolve(url);
				} else if (url.indexOf("git@github.com:") === 0) {
					url = url.substring("git@github.com:".length);
					if (url.endsWith(".git")) {
						url = url.substr(0, url.length - ".git".length);
					}
					resolve(`github.com/${url}`);
				} else {
					reject(new Error(`unexpected origin url: ${url}`));
				}
			})
			.catch(reject);
	});
}

export function getRev(): Promise<string> {
	return execGitCommand(vscode.workspace.rootPath, "rev-parse", ["HEAD"])
		.then((rev) => rev.trim());
}

export function getBranch(): Promise<string> {
	// branch name, or "HEAD" for detached state
	return execGitCommand(vscode.workspace.rootPath, "rev-parse", ["--abbrev-ref", "HEAD"])
		.then((branch) => branch.trim());
}

export function isRevUpstream(rev: string): Promise<boolean> {
	return new Promise<boolean>((resolve, reject) => {
		getBranch().then((branch) => {
			if (branch === "HEAD") {
				// detached state
				return resolve(false);
			}
			execGitCommand(vscode.workspace.rootPath, "show", [`origin/${branch}..HEAD`])
				.then((output) => resolve(output.trim() === ""))
				.catch(() => resolve(false));
		}).catch(() => resolve(false));
	});
}

export function trimRootPath(path: string): string {
	if (path.startsWith(vscode.workspace.rootPath)) {
		return path.substr(vscode.workspace.rootPath.length + 1); // exclude leading slash
	}
	return path;
}

export function isDirectory(absPath: string): boolean {
	return fs.statSync(absPath).isDirectory();
}

export function currentFile(): string {
	const editor = vscode.window.activeTextEditor;
	const path = editor.document.fileName;
	return trimRootPath(path);
}

export function isFileClean(): Promise<boolean> {
	return new Promise<boolean>((resolve, reject) => {
		if (vscode.window.activeTextEditor.document.isDirty) {
			return resolve(false);
		}
		getRev().then((rev) => {
			execGitCommand(vscode.workspace.rootPath, "diff", [`origin`, rev, "--", currentFile()])
				.then((output) => resolve(output.trim() === ""))
				.catch(() => resolve(false));
		}).catch(reject);
	});
}
