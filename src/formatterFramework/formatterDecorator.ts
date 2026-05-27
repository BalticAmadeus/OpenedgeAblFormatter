export const formatterRegistry: { [formatterLabel: string]: any } = {};

export let formatterId: number = 0;

export function RegisterFormatter(target: any) {
    formatterRegistry[formatterId] = target;
    // Suppress formatter registration logs in CLI or when ABL_FORMATTER_QUIET is set
    if (
        typeof process !== "undefined" &&
        (process.env.ABL_FORMATTER_QUIET || process.env.NODE_ENV === "production")
    ) {
        // Silent mode
    } else if (typeof process !== "undefined" && process.env.ABL_FORMATTER_VERBOSE) {
        console.log("Formatter was found:", formatterId, target.formatterLabel);
    }
    formatterId++;
}
