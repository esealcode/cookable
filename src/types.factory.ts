'use client'
import { ExtractStringNumberOccurenceArray, ConcatPath, ConcatArrayPath } from './types.helper'
import { PREDICATE_REJECT_SYMBOL } from './constant'

export type TPredicateRejection = typeof PREDICATE_REJECT_SYMBOL

export type TPath = (string | number | symbol)[]

export type TRecipeAction =
    | {
          type: 'property'
          key: string | number | symbol
      }
    | {
          type: 'select' | 'selectOnce'
          predicate: (value: any, reject: TPredicateRejection, index: number) => unknown | TPredicateRejection
      }
    | {
          type: 'selectAll'
      }
    | {
          type: 'selectAt'
          index: number
      }
    | {
          type: 'remove'
          predicate: (value: any, index: number) => boolean
      }
    | {
          type: 'removeAt'
          index: number
      }
    | {
          type: 'guard'
          guard: (value: any, reject: TPredicateRejection) => unknown | TPredicateRejection
      }
    | {
          type: 'update'
          updater: (value: any) => any
      }
    | {
          type: 'pipe'
          recipes: TRecipeAction[][]
      }

export type TInternalCallableActionType = TRecipeAction['type']

// @note: For anyone confused, `infer U` for TRecipeFactoryArray and `T[K]` for TRecipeFactoryObject
// is where types are broken down which is why we can write `TRecipeFactory<T, T>`
export type TRecipeFactoryArray<T, S, I extends boolean, P extends string = ''> = [T] extends [(infer U)[]]
    ? {
          select: <R extends U>(predicate: (value: U, reject: TPredicateRejection, index: number) => R | TPredicateRejection) => TRecipeFactory<R, S, I, ConcatArrayPath<P>>
          selectOnce: <R extends U>(predicate: (value: U, reject: TPredicateRejection, index: number) => R | TPredicateRejection) => TRecipeFactory<R, S, I, ConcatArrayPath<P>>
          selectAll: () => TRecipeFactory<U, S, I, ConcatArrayPath<P>>
          selectAt: (index: number) => TRecipeFactory<U, S, I, ConcatArrayPath<P>>

          remove: (predicate: (value: U) => boolean) => TRecipeFactory<T, S, I, ConcatArrayPath<P>>
          removeAt: (index: number) => TRecipeFactory<T, S, I, ConcatArrayPath<P>>
      } & TRecipeFactoryCommon<T, S, I, P>
    : never

export type TRecipeFactoryObject<T, S, I extends boolean, P extends string = ''> = [T] extends [object]
    ? {
          <K extends keyof T & string>(key: K): TRecipeFactory<T[K], S, I, ConcatPath<P, `${K}`>>
      } & TRecipeFactoryCommon<T, S, I, P>
    : never

export type TRecipeFactoryScalar<T, S, I extends boolean, P extends string = ''> = TRecipeFactoryCommon<T, S, I, P>

export type TRecipeFactoryCommon<T, S, I extends boolean, P extends string = ''> = {
    id: <R extends P>(...args: ExtractStringNumberOccurenceArray<P>) => R
    instructionPath: TRecipeAction[]
    updater: <R extends T>(updater: (value: T) => R) => TRecipeFactory<R, S, I, P>
    guard: <R extends T>(guard: (value: T, reject: TPredicateRejection) => R | TPredicateRejection) => TRecipeFactory<R, S, I, P>
    pipe: <U, Pn extends string>(fn: (recipe: TRecipeFactory<T, S, I, P>) => TRecipeFactory<U, S, I, Pn>) => TRecipeFactory<T, S, I, P> // @note: I couldn't make Typescript work with multiple pipe fn arguments here.
    cook: I extends true ? () => S : (state: S) => S
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
export type TRecipeFactory<T, S, I extends boolean, P extends string = ''> = (
    [T] extends [any[]]
    ? TRecipeFactoryArray<T, S, I, P>
    : [T] extends [object]
    ? TRecipeFactoryObject<T, S, I, P>
    : TRecipeFactoryScalar<T, S, I, P>
)