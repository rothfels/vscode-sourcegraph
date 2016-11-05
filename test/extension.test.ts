import * as utils from "../src/utils";
import * as assert from "assert";

suite("Extension Tests", () => {

	test("getGitPath", () => {
		// assumes git is installed on our system.
		return utils.getGitPath().then((path) => {
			assert.ok(path);
		});
	});

	// TODO: we can't use this project as the workspace root for testing (because vscode already has the workspace opened to launch tests???)
	// test("getRepoURI", () => {
	// 	return utils.getRepoURI().then((uri) => {
	// 		assert.equal(uri, "github.com/rothfels/vscode-sourcegraph");
	// 	});
	// });
});
