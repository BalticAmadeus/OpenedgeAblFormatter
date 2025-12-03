export const formatterRegistry: { [formatterLabel: string]: any } = {};

export let formatterId: number = 0;

export function RegisterFormatter(target: any) {
    formatterRegistry[formatterId] = target;
    formatterId++;
}
