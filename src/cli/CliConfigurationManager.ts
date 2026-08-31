import { IConfigurationManager } from "../utils/IConfigurationManager";
import * as fs from "fs";
import * as path from "path";

/**
 * CLI Configuration Manager - reads settings from .ablformatter.json or command-line overrides
 */
export class CliConfigurationManager implements IConfigurationManager {
    private settings: Record<string, any> = {};
    private tabSize: number = 4;

    constructor(configFilePath?: string, overrides?: Record<string, any>) {
        // Set defaults for all formatters
        this.initializeDefaults();

        // Load from config file if provided
        if (configFilePath && fs.existsSync(configFilePath)) {
            try {
                const configContent = fs.readFileSync(configFilePath, "utf-8");
                const fileSettings = JSON.parse(configContent);
                this.settings = { ...this.settings, ...fileSettings };
            } catch (error) {
                console.warn(`Warning: Could not parse config file: ${error}`);
            }
        }

        // Apply command-line overrides
        if (overrides) {
            this.settings = { ...this.settings, ...overrides };
        }
    }

    private initializeDefaults(): void {
        this.settings = {
            "AblFormatter.assignFormatting": true,
            "AblFormatter.assignFormattingAssignLocation": "New",
            "AblFormatter.assignFormattingAlignRightExpression": "Yes",
            "AblFormatter.assignFormattingEndDotLocation": "New aligned",
            "AblFormatter.findFormatting": true,
            "AblFormatter.forFormatting": true,
            "AblFormatter.caseFormatting": true,
            "AblFormatter.caseFormattingThenLocation": "Same",
            "AblFormatter.caseFormattingDoLocation": "Same",
            "AblFormatter.caseFormattingStatementLocation": "New",
            "AblFormatter.blockFormatting": true,
            "AblFormatter.ifFormatting": true,
            "AblFormatter.ifFormattingThenLocation": "Same",
            "AblFormatter.ifFormattingDoLocation": "Same",
            "AblFormatter.ifFormattingStatementLocation": "Same",
            "AblFormatter.temptableFormatting": true,
            "AblFormatter.temptableFormattingEndDotLocation": "Same",
            "AblFormatter.usingFormatting": true,
            "AblFormatter.usingFormattingFromPropath": "DoNothing",
            "AblFormatter.bodyFormatting": true,
            "AblFormatter.propertyFormatting": true,
            "AblFormatter.ifFunctionFormatting": true,
            "AblFormatter.ifFunctionFormattingAddParentheses": "No",
            "AblFormatter.ifFunctionFormattingElseLocation": "Same",
            "AblFormatter.enumFormatting": true,
            "AblFormatter.enumFormattingEndDotLocation": "Same",
            "AblFormatter.variableDefinitionFormatting": true,
            "AblFormatter.procedureParameterFormatting": true,
            "AblFormatter.functionParameterFormatting": true,
            "AblFormatter.functionParameterFormattingAlignParameterTypes": "Yes",
            "AblFormatter.arrayAccessFormatting": true,
            "AblFormatter.arrayAccessFormattingAddSpaceAfterComma": "Yes",
            "AblFormatter.expressionFormatting": true,
            "AblFormatter.expressionFormattingLogicalLocation": "New",
            "AblFormatter.statementFormatting": true,
            "AblFormatter.variableAssignmentFormatting": true,
            "AblFormatter.showTreeInfoOnHover": false,
            "AblFormatter.showPromotionalNotifications": false,
            "Telemetry.ablFormatterTelemetry": false,
        };
    }

    public get(name: string): any {
        const prefixedName = name.startsWith("AblFormatter.")
            ? name
            : `AblFormatter.${name}`;

        if (this.settings[name] !== undefined) {
            return this.settings[name];
        }

        return this.settings[prefixedName];
    }

    public setTabSize(tabSize: number): void {
        this.tabSize = tabSize;
    }

    public getTabSize(): number {
        return this.tabSize;
    }

    public setOverridingSettings(settings: any): void {
        this.settings = { ...this.settings, ...settings };
    }

    public getAll(): Record<string, any> {
        return { ...this.settings, tabSize: this.tabSize };
    }
}
