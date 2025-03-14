import { Edit } from "tree-sitter";

export interface CodeEdit {
    edit: Edit;
    text: string;
}
