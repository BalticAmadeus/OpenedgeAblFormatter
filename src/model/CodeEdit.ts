import { Edit } from "web-tree-sitter";

export interface CodeEdit {
    edit: Edit;
    text: string;
}
