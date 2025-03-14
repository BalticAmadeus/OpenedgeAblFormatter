const path = require("path");
const os = require("os");
const { versions } = process;

function loadModule() {
  try {
    // Try loading prebuilt binary dynamically based on Node.js version
    const modulePath = path.join(
      __dirname,
      "..",
      "..",
      "prebuilds",
      "win32-x64",
      `yourmodule-${versions.modules}.node`
    );

    console.log(`Loading prebuilt binary from: ${modulePath}`);
    return require(modulePath);
  } catch (error1) {
    if (error1.code !== "MODULE_NOT_FOUND") {
      throw error1;
    }

    try {
      // Fallback to manually built Release version
      return require("../../build/Release/tree_sitter_abl_binding");
    } catch (error2) {
      if (error2.code !== "MODULE_NOT_FOUND") {
        throw error2;
      }

      try {
        // Fallback to manually built Debug version
        return require("../../build/Debug/tree_sitter_abl_binding");
      } catch (error3) {
        if (error3.code !== "MODULE_NOT_FOUND") {
          throw error3;
        }

        throw error1; // If all attempts fail, throw the original error
      }
    }
  }
}

// Load the correct module
module.exports = loadModule();

// Try loading node type info if available
try {
  module.exports.nodeTypeInfo = require("../../src/node-types.json");
} catch (_) {}
