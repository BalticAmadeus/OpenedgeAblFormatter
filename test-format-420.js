const fs = require('fs');
const path = require('path');

// Import the compiled formatter
const { FormattingEngine } = require('./out/formatterFramework/FormattingEngine');
const { AblParserHelper } = require('./out/parser/AblParserHelper');
const { FileIdentifier } = require('./out/model/FileIdentifier');
const { ConfigurationManager } = require('./out/utils/ConfigurationManager');
const { DebugManager } = require('./out/providers/DebugManager');
const { EOL } = require('./out/model/EOL');

async function testFormat() {
    // Read the input file
    const inputFile = path.join(__dirname, 'resources', 'samples', 'expressionFormatting.p');
    const inputText = fs.readFileSync(inputFile, 'utf8');
    
    console.log('='.repeat(80));
    console.log('BEFORE FORMATTING:');
    console.log('='.repeat(80));
    console.log(inputText);
    console.log(`Character count: ${inputText.length}`);
    console.log('');
    
    // Create formatter instances (mock objects for testing)
    const parserHelper = new AblParserHelper();
    const fileIdentifier = new FileIdentifier('test.p', 'file:///test.p');
    const configManager = {
        getConfiguration: () => ({
            assignFormatting: true,
            blockFormatting: true,
            ifFormatting: true,
            usingFormatting: true,
            caseFormatting: true,
            findFormatting: true,
            forFormatting: true,
            ifFunctionFormatting: true,
            temptableFormatting: true,
            propertyFormatting: true,
            expressionFormatting: true,
            bodyFormatting: true,
            enumFormatting: true,
            variableDefinitionFormatting: true,
            procedureParameterFormatting: true,
            functionParameterFormatting: true,
            arrayAccessFormatting: true,
            statementFormatting: true,
            variableAssignmentFormatting: true
        }),
        setOverridingSettings: () => {}
    };
    const debugManager = {
        isDebugMode: () => false,
        logFormattingChanges: () => {},
        logTree: () => {}
    };
    
    // Create formatting engine
    const engine = new FormattingEngine(
        parserHelper,
        fileIdentifier,
        configManager,
        debugManager
    );
    
    // Format the text
    const eol = new EOL('\n');
    const formatted = engine.formatText(inputText, eol, false);
    
    console.log('='.repeat(80));
    console.log('AFTER FORMATTING:');
    console.log('='.repeat(80));
    console.log(formatted);
    console.log(`Character count: ${formatted.length}`);
    console.log('');
    
    console.log('='.repeat(80));
    console.log('COMPARISON:');
    console.log('='.repeat(80));
    console.log(`Before: ${inputText.length} characters`);
    console.log(`After:  ${formatted.length} characters`);
    console.log(`Change: ${formatted.length - inputText.length} characters`);
    
    if (formatted.length < inputText.length && formatted.length < 100) {
        console.log('\n⚠️  WARNING: Output is suspiciously short - possible truncation bug!');
    } else if (formatted.length < inputText.length) {
        console.log('\n✓ Formatting removed extra spaces as expected');
    }
}

testFormat().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
