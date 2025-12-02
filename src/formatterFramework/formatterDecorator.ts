export const formatterRegistry: { [formatterLabel: string]: any } = {};

export let formatterId: number = 0;

export function RegisterFormatter(target: any) {
    formatterRegistry[formatterId] = target;
    // console.log("Formatter was found:", formatterId, target.formatterLabel);
    formatterId++;
}
