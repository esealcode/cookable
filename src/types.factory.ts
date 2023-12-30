'use client'

import { TPredicateRejection, TRecipeAction } from './types'

// @note: For anyone confused, `infer U` for TRecipeFactoryArray and `T[K]` for TRecipeFactoryObject
// is where types are broken down which is why we can write `TRecipeFactory<T, T>`
export type TRecipeFactoryArray<T, S, I extends boolean> = [T] extends [(infer U)[]]
    ? {
          select: <R extends U>(predicate: (value: U, reject: TPredicateRejection, index: number) => R | TPredicateRejection) => TRecipeFactory<R, S, I>
          selectOnce: <R extends U>(predicate: (value: U, reject: TPredicateRejection, index: number) => R | TPredicateRejection) => TRecipeFactory<R, S, I>
          selectAll: () => TRecipeFactory<U, S, I>
          selectAt: (index: number) => TRecipeFactory<U, S, I>

          remove: (predicate: (value: U) => boolean) => TRecipeFactory<T, S, I>
          removeAt: (index: number) => TRecipeFactory<T, S, I>
      } & TRecipeFactoryCommon<T, S, I>
    : never

export type TRecipeFactoryObject<T, S, I extends boolean> = [T] extends [object]
    ? {
          <K extends keyof T>(key: K): TRecipeFactory<T[K], S, I>
      } & TRecipeFactoryCommon<T, S, I>
    : never

export type TRecipeFactoryScalar<T, S, I extends boolean> = TRecipeFactoryCommon<T, S, I>

export type TRecipeFactoryCommon<T, S, I extends boolean> = {
    id: string
    instructionPath: TRecipeAction[]
    update: <R extends T>(updater: (value: T) => R) => TRecipeFactory<R, S, I>
    guard: <R extends T>(guard: (value: T, reject: TPredicateRejection) => R | TPredicateRejection) => TRecipeFactory<R, S, I>
    pipe: <U>(fn: (recipe: TRecipeFactory<T, S, I>) => TRecipeFactory<U, S, I>) => TRecipeFactory<T, S, I> // @note: I couldn't make Typescript work with multiple pipe fn arguments here.
    cook: I extends true ? (state?: S) => NonNullable<S> : (state: S) => NonNullable<S>
}

// @warn: We're disabling the distributive conditional types behavior here by using [] around
// the types surrounding `extends`. This is because letting Typescript distribute our types
// will cause the updater calls to break when their corresponding value is a union.
//
// This part is critical and a core to the utility typing but it may also unexpectedly
// break an edge case since distributive behavior is the default and expected one.
//
// see: https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
// demo: https://www.typescriptlang.org/play?#code/KYDwDg9gTgLgBDAnmYcAqAhKEDWwB2AwhPgCYCWM5JAhgDYCqYpNMwUAPGgHxwC86OKDZkAznAgAjAFbAAxvAD8ggFxwAFAFdmrdmvUA3epuBq0ASn68LVuAYjlSAKCdIU6LLgJpkwUsTJKanx6JhY2KH4PbDwiEgoqWkYdCI5RGChyfABzOAAfOE0yYAAzLL9uFzkSdLhJGIIw3UiBAG8AXzgacUwG-B8Uf3igpKaIl3qvfDH2Q1sDSwB6RfQAC3JxGFXsAHdRF1BIWARfdAB1aBws7ICE4NCU9i5eAQBtNABdIRARUnFXqSyBRfZRoOD6bThPQaIx0ExmSx8ayI3j2RxwZZwAByECoclQW1Qry+ok0UGwRQoOUENDIEhk8hgLjcqDQFygVxyAz8txGIWSUJa50u115iX5M046Uy1IKlNK5VIlSc1XwtR2IpykqiHS6PXZnOy3KGgXFD0FLg1HOukrmSLsSxWaHW4lIEGAonwAHJ4Ftdk4gA
export type TRecipeFactory<T, S, I extends boolean> = (
    [T] extends [any[]]
    ? TRecipeFactoryArray<T, S, I>
    : [T] extends [object]
    ? TRecipeFactoryObject<T, S, I>
    : TRecipeFactoryScalar<T, S, I>
)