'use client'

import { createRecipeAction, stringifyRecipeInstructionPath, spreadObjectOrArray } from './util'
import { TRecipeAction, TPredicateRejection } from './types'
import { TRecipeFactory, TRecipeFactoryArray, TRecipeFactoryObject, TRecipeFactoryCommon } from './types.factory'
import { ExtractCallSignature } from './types.helper'
import { cook } from './cook'

const _createRecipeFactory = <T, S, I extends boolean>(instructionPath: TRecipeAction[] = [], state: S | null) => {
    const arrayFactory: Pick<TRecipeFactoryArray<T, S, I>, 'select' | 'selectOnce' | 'selectAll' | 'selectAt' | 'remove' | 'removeAt'> = {
        select: (predicate) => {
            return _createRecipeFactory<Exclude<ReturnType<typeof predicate>, TPredicateRejection>, S, I>([
                ...instructionPath,
                createRecipeAction({ type: 'select', predicate }),
            ], state)
        },
        selectOnce: (predicate) => {
            return _createRecipeFactory<Exclude<ReturnType<typeof predicate>, TPredicateRejection>, S, I>([
                ...instructionPath,
                createRecipeAction({ type: 'selectOnce', predicate }),
            ], state)
        },
        selectAll: () => {
            return _createRecipeFactory<T extends (infer U)[] ? U : never, S, I>([...instructionPath, createRecipeAction({ type: 'selectAll' })], state)
        },
        selectAt: (index) => {
            return _createRecipeFactory<T extends (infer U)[] ? U : never, S, I>([...instructionPath, createRecipeAction({ type: 'selectAt', index })], state)
        },
        remove: predicate => {
            return _createRecipeFactory<T, S, I>([...instructionPath, createRecipeAction({ type: 'remove', predicate })], state)
        },
        removeAt: index => {
            return _createRecipeFactory<T, S, I>([...instructionPath, createRecipeAction({ type: 'removeAt', index })], state)
        }
    }

    const objectFactoryFn = ((key) => {
        return _createRecipeFactory<T extends object ? T[typeof key] : never, S, I>([
            ...instructionPath,
            createRecipeAction({ type: 'property', key: key as string | number | symbol }),
        ], state)
    }) as ExtractCallSignature<TRecipeFactoryObject<T, S, I>>

    const objectFactory: Omit<TRecipeFactoryObject<T, S, I>, 'id' | 'executionPath' | 'updater' | 'cook'> = Object.assign(objectFactoryFn)

    const common: TRecipeFactoryCommon<T, S, I> = {
        id: `recipe(${''}).${stringifyRecipeInstructionPath(instructionPath)}`,
        instructionPath,
        update: (updater) => {
            return _createRecipeFactory<ReturnType<typeof updater>, S, I>([...instructionPath, createRecipeAction({ type: 'update', updater })], state)
        },
        guard: (guard) => {
            return _createRecipeFactory<Exclude<ReturnType<typeof guard>, TPredicateRejection>, S, I>([
                ...instructionPath,
                createRecipeAction({ type: 'guard', guard }),
            ], state)
        },
        pipe: (...recipeCreators) => {
            return _createRecipeFactory<T, S, I>([
                ...instructionPath,
                createRecipeAction({ type: 'pipe', recipes: recipeCreators.map((creator) => creator(_createRecipeFactory<T, S, I>([], state)).instructionPath) }),
            ], state)
        },
        cook: (overrideState) => {
            const input = overrideState ?? state

            if (!input) {
                throw new Error('cook function called but no input state was found')
            }

            return cook(instructionPath, spreadObjectOrArray(input), [])
        }
    }

    const factory = Object.assign(objectFactory, arrayFactory, common) as TRecipeFactory<T, S, I>

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
        return _createRecipeFactory<any, any, false>([], state ?? null)
    }

    return _createRecipeFactory<any, any, true>([], state ?? null)
}

export { createRecipeFactory }