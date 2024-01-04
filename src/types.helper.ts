export type ExtractCallSignature<T> = T extends (...args: infer P) => infer R ? (...args: P) => R : never

export type ExtractStringNumberOccurenceArray<T extends string> = T extends `${infer Prefix}${infer Suffix}`
  ? Prefix extends `${number}` ? [number, ...ExtractStringNumberOccurenceArray<Suffix>] : [...ExtractStringNumberOccurenceArray<Suffix>]
  : []

export type ConcatPath<T, P extends string> = T extends `` ? P : T extends `${infer Prefix}` ? `${Prefix}.${P}` : never
export type ConcatArrayPath<T> = ConcatPath<T, `${number}`>