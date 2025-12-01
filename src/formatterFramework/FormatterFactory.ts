import { IConfigurationManager } from "../utils/IConfigurationManager";
import { IFormatter } from "./IFormatter";
import { formatterRegistry } from "./formatterDecorator";
import { DefaultFormatter } from "../formatters/defaultFormatter/DefaultFormatter";

export class FormatterFactory {
    public static getFormatterInstances(
        configurationManager: IConfigurationManager
    ): IFormatter[] {
        const instances: IFormatter[] = [];
        instances.push(new DefaultFormatter(configurationManager));
        for (const formatterClass in formatterRegistry) {
            if (
                FormatterFactory.isEnabled(
                    formatterRegistry[formatterClass].formatterLabel,
                    configurationManager
                )
            ) {
                instances.push(
                    new formatterRegistry[formatterClass](configurationManager)
                );
            }
        }
        
        // Prioritize VariableAssignmentFormatter to run first
        // This prevents position corruption when assignment operators are at position 31+
        instances.sort((a, b) => {
            const aLabel = (a.constructor as any).formatterLabel || "";
            const bLabel = (b.constructor as any).formatterLabel || "";
            
            if (aLabel === "variableAssignmentFormatting") return -1;
            if (bLabel === "variableAssignmentFormatting") return 1;
            return 0;
        });
        
        console.log(`[FormatterFactory] Formatter order: ${instances.map(f => (f.constructor as any).formatterLabel || f.constructor.name).join(", ")}`);
        
        return instances;
    }

    private static isEnabled(
        formatterName: string,
        configurationManager: IConfigurationManager
    ): boolean {
        if (configurationManager.get(formatterName)!) {
            return true;
        }

        if (formatterName.startsWith("DEBUG-")) {
            return true;
        }
        return false;
    }
}
