#include "tree_sitter/parser.h"
#include <napi.h>

typedef struct TSLanguage TSLanguage;

extern "C" TSLanguage *tree_sitter_abl();

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    // Set the "name" property to "abl"
    exports.Set("name", Napi::String::New(env, "abl"));

    // Create an external reference to the Tree-sitter language
    Napi::External<TSLanguage> language = Napi::External<TSLanguage>::New(env, tree_sitter_abl());

    // Attach the language object to exports
    exports.Set("language", language);

    return exports;
}

// Register the module with N-API
NODE_API_MODULE(tree_sitter_abl_binding, Init)