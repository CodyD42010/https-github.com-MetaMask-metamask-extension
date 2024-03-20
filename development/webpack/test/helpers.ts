export type Combination<T> = {
  [P in keyof T]: T[P] extends readonly (infer U)[] ? U : never;
};

export function generateCases<T extends object>(obj: T): Combination<T>[] {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => {
      return acc.flatMap((cases) =>
        value.map((cas: unknown) => ({ ...cases, [key]: cas })),
      );
    },
    [{} as Combination<T>],
  );
}
