export const enumKeys = (a: object): string[] => Object.entries(a).filter(([, value]) => !isNaN(Number(value))).map(([key]) => key);
export const enumValuesFor = <T>(key: string, E: object): T => (E as Record<string, T>)[key];
