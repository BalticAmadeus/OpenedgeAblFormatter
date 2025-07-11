import { AssignFormatter } from "../formatters/assign/AssignFormatter";
import { BlockFormater } from "../formatters/block/BlockFormatter";
import { IfFormatter } from "../formatters/if/IfFormatter";
import { UsingFormatter } from "../formatters/using/UsingFormatter";
import { CaseFormatter } from "../formatters/case/CaseFormatter";
import { FindFormatter } from "../formatters/find/FindFormatter";
import { ForFormatter } from "../formatters/for/ForFormatter";
import { IfFunctionFormatter } from "../formatters/ifFunction/IfFunctionFormatter";
import { TempTableFormatter } from "../formatters/tempTable/TempTableFormatter";
import { PropertyFormatter } from "../formatters/property/PropertyFormatter";
import { ExpressionFormatter } from "../formatters/expression/ExpressionFormatter";
import { BodyFormatter } from "../formatters/body/BodyFormatter";
import { EnumFormatter } from "../formatters/enum/EnumFormatter";
import { VariableDefinitionFormatter } from "../formatters/variableDefinition/VariableDefinitionFormatter";
import { ProcedureParameterFormatter } from "../formatters/procedureParameter/ProcedureParameterFormatter";
import { FunctionParameterFormatter } from "../formatters/functionParameter/FunctionParameterFormatter";
import { ArrayAccessFormatter } from "../formatters/arrayAccess/ArrayAccessFormatter";
import { StatementFormatter } from "../formatters/statement/StatementFormatter";
import { VariableAssignmentFormatter } from "../formatters/variableAssignment/VariableAssignmentFormatter";

// needed just for enabling decorators. Decorators does not work if there is no usage of a class in the reachable code
export function enableFormatterDecorators(): void {
    AssignFormatter;
    BlockFormater;
    BodyFormatter;
    IfFormatter;
    UsingFormatter;
    CaseFormatter;
    FindFormatter;
    ForFormatter;
    TempTableFormatter;
    PropertyFormatter;
    IfFunctionFormatter;
    VariableDefinitionFormatter;
    EnumFormatter;
    ProcedureParameterFormatter;
    FunctionParameterFormatter;
    ArrayAccessFormatter;
    ExpressionFormatter;
    StatementFormatter;
    VariableAssignmentFormatter;
}
