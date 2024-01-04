'use client'

import { createRecipeAction, spreadObjectOrArray } from './util'
import { TRecipeFactory, TRecipeFactoryArray, TRecipeFactoryObject, TRecipeFactoryCommon, TRecipeAction, TPredicateRejection } from './types.factory'
import { INTERNAL_NO_STATE_SYMBOL, INTERNAL_ARRAY_CALLABLE_PROPERTIES } from './constant'
import { ExtractCallSignature, ConcatArrayPath } from './types.helper'
import { cook } from './cook'

const _createRecipeFactory = <T, S, I extends boolean, P extends string = ``>(instructionPath: TRecipeAction[] = [], state: S | typeof INTERNAL_NO_STATE_SYMBOL) => {

    const arrayFactory: Pick<TRecipeFactoryArray<T, S, I, P>, 'select' | 'selectOnce' | 'selectAll' | 'selectAt' | 'remove' | 'removeAt'> = {
        select: (predicate) => {
            return _createRecipeFactory<Exclude<ReturnType<typeof predicate>, TPredicateRejection>, S, I, ConcatArrayPath<P>>([
                ...instructionPath,
                createRecipeAction({ type: 'select', predicate }),
            ], state)
        },
        selectOnce: (predicate) => {
            return _createRecipeFactory<Exclude<ReturnType<typeof predicate>, TPredicateRejection>, S, I, ConcatArrayPath<P>>([
                ...instructionPath,
                createRecipeAction({ type: 'selectOnce', predicate }),
            ], state)
        },
        selectAll: () => {
            return _createRecipeFactory<T extends (infer U)[] ? U : never, S, I, ConcatArrayPath<P>>([...instructionPath, createRecipeAction({ type: 'selectAll' })], state)
        },
        selectAt: (index) => {
            return _createRecipeFactory<T extends (infer U)[] ? U : never, S, I, ConcatArrayPath<P>>([...instructionPath, createRecipeAction({ type: 'selectAt', index })], state)
        },
        remove: predicate => {
            return _createRecipeFactory<T, S, I, ConcatArrayPath<P>>([...instructionPath, createRecipeAction({ type: 'remove', predicate })], state)
        },
        removeAt: index => {
            return _createRecipeFactory<T, S, I, ConcatArrayPath<P>>([...instructionPath, createRecipeAction({ type: 'removeAt', index })], state)
        }
    }

    const objectFactoryFn = ((key) => {
        return _createRecipeFactory<T extends object ? T[typeof key] : never, S, I, P>([
            ...instructionPath,
            createRecipeAction({ type: 'property', key: key as string | number | symbol }),
        ], state)
    }) as ExtractCallSignature<TRecipeFactoryObject<T, S, I, P>>

    const objectFactory: Omit<TRecipeFactoryObject<T, S, I, P>, 'id' | 'executionPath' | 'updater' | 'cook'> = Object.assign(objectFactoryFn)

    const common: TRecipeFactoryCommon<T, S, I, P> = {
        id: (...args: number[]) => {
            const indices = [...args]
            const path = instructionPath.map(instruction => {
                if (instruction.type === 'property') {
                    return instruction.key
                }

                if (INTERNAL_ARRAY_CALLABLE_PROPERTIES.includes(instruction.type)) {
                    return indices.shift()?.toString()
                }

                return ''
            }).join('.')

            return path as any // @todo: see if we can properly type here
        },
        instructionPath,
        updater: (updater) => {
            return _createRecipeFactory<ReturnType<typeof updater>, S, I, P>([...instructionPath, createRecipeAction({ type: 'update', updater })], state)
        },
        guard: (guard) => {
            return _createRecipeFactory<Exclude<ReturnType<typeof guard>, TPredicateRejection>, S, I, P>([
                ...instructionPath,
                createRecipeAction({ type: 'guard', guard }),
            ], state)
        },
        pipe: (...recipeCreators) => {
            return _createRecipeFactory<T, S, I, P>([
                ...instructionPath,
                createRecipeAction({ type: 'pipe', recipes: recipeCreators.map((creator) => creator(_createRecipeFactory<T, S, I, P>([], state)).instructionPath) }),
            ], state)
        },
        cook: (overrideState?: S) => {
            // @warn: In case of the developer input being `undefined`, the below code still behave properly but
            // this is pure luck. We will receive state as being `INTERNAL_NO_STATE_SYMBOL` so we'll read `overrideState`
            // which will be `undefined` by default, matching the only initial state that can result in `INTERNAL_NO_STATE_SYMBOL`
            // to be passed.
            const executeOnState = state !== INTERNAL_NO_STATE_SYMBOL ? state : overrideState as S

            return cook(instructionPath, spreadObjectOrArray(executeOnState), [])
        }
    }

    const factory = Object.assign(objectFactory, arrayFactory, common) as TRecipeFactory<T, S, I, P>

    return factory
}

// @note: Proxy function just to hide the instructionPath parameter to the developer

// @pitfalls:
// - If you reduce the type by looking up a specific value (e.g: id === '0') and you intend to
// update this same value, you'll need to cast it back to a more general type (e.g: string) because at
// this point the value will be restricted to '0'
function createRecipeFactory<T>(): TRecipeFactory<T, T, false>
function createRecipeFactory<T>(state: T): TRecipeFactory<T, T, true>
function createRecipeFactory(state?: any) {
    if (state === undefined) {
        return _createRecipeFactory<any, any, false>([], INTERNAL_NO_STATE_SYMBOL)
    }

    return _createRecipeFactory<any, any, true>([], state)
}

export { createRecipeFactory }