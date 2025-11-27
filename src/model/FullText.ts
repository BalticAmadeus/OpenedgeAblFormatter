export interface FullText {
    text: string;
    eolDelimiter: string;
    // Cache of formatted text for each node (by node ID)
    // Allows parent formatters to read already-formatted child text
    formattedNodeTexts: Map<number, string>;
}
