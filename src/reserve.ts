/*// lethimcook.ts

'use client'

type TPredicateRejection = '__@@PREDICATE_REJECT'

const PREDICATE_REJECT: TPredicateRejection = '__@@PREDICATE_REJECT'

type ExtractCallSignature<T> = T extends (...args: infer P) => infer R ? (...args: P) => R : never

type TRecipeFactoryUpdater<T, S> = <R extends T>(updater: (value: T) => R) => TRecipeFactory<R, S>

// @note: For anyone confused, `infer U` for TRecipeFactoryArray and `T[K]` for TRecipeFactoryObject
// is where types are broken down which is why we can write `TRecipeFactory<T, T>`
type TRecipeFactoryArray<T, S> = [T] extends [(infer U)[]]
    ? {
          select: <R extends U>(predicate: (value: U, index: number, reject: TPredicateRejection) => R | TPredicateRejection) => TRecipeFactory<R, S>
          selectOnce: <R extends U>(predicate: (value: U, index: number, reject: TPredicateRejection) => R | TPredicateRejection) => TRecipeFactory<R, S>
          selectAll: () => TRecipeFactory<U, S>
      } & TRecipeFactoryCommon<T, S>
    : never

type TRecipeFactoryObject<T, S> = [T] extends [object]
    ? {
          <K extends keyof T>(key: K): TRecipeFactory<T[K], S>
      } & TRecipeFactoryCommon<T, S>
    : never

type TRecipeFactoryScalar<T, S> = TRecipeFactoryCommon<T, S>

type TRecipeFactoryCommon<T, S> = {
    id: string
    executionPath: TRecipeAction[]
    update: TRecipeFactoryUpdater<T, S>
    guard: <R extends T>(guard: (value: T, reject: TPredicateRejection) => R | TPredicateRejection) => TRecipeFactory<R, S>
    pipe: <U>(fn: (recipe: TRecipeFactory<T, S>) => TRecipeFactory<U, S>) => TRecipeFactory<T, S> // @note: I couldn't make Typescript work with multiple pipe fn arguments here.
    cook: (state: S) => S
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
export type TRecipeFactory<T, S> = [T] extends [any[]]
    ? TRecipeFactoryArray<T, S>
    : [T] extends [object]
    ? TRecipeFactoryObject<T, S>
    : TRecipeFactoryScalar<T, S>

type TRecipeAction =
    | {
          type: 'property'
          key: string | number | symbol
      }
    | {
          type: 'select' | 'selectOnce'
          predicate: (value: any, index: number, reject: TPredicateRejection) => unknown | TPredicateRejection
      }
    | {
          type: 'selectAll'
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

const createRecipeAction = (action: TRecipeAction) => action
const createRecipeActionPathArray = (...args: TRecipeAction['type'][]) => args

const spreadObjectOrArray = <T>(value: T): T => {
    if (isArray(value)) {
        return [...value] as T
    }

    if (isObject(value)) {
        return { ...value }
    }

    return value
}

type TPath = (string | number | symbol)[]

const stringifyPath = (path: TPath) => path.join('.')
const stringifyRecipeExecutionPath = (executionPath: TRecipeAction[]) => {
    return executionPath
        .map((action) => {
            if (action.type === 'property') {
                return action.key
            }

            if (createRecipeActionPathArray('select', 'selectOnce', 'selectAll').includes(action.type)) {
                return '0'
            }

            return ''
        })
        .join('.')
}

const cook = <S>(recipe: TRecipeAction[], state: S, path: TPath, updateOrigin?: (updater: (value: S) => S) => S): S => {
    if (recipe.length === 0) {
        return state
    }

    const action = recipe[0]
    const next = state

    if (action.type === 'property') {
        if (!isObject(next)) {
            throw new Error(`Cannot get property ${action.key.toString()} on non-object value at ${stringifyPath(path)}`) // @todo: add path in error message
        }

        const key = action.key as keyof typeof next

        next[key] = spreadObjectOrArray(next[key])

        cook(recipe.slice(1), next[key], [...path, key], (updater) => {
            next[key] = updater(next[key])
            return next[key]
        })

        return next
    }

    if (action.type === 'guard') {
        // @warn: If the guard fails, the update cannot occur as any further calls are unsafe
        if (action.guard(next, '__@@PREDICATE_REJECT') === PREDICATE_REJECT) return next

        return cook(recipe.slice(1), next, path, updateOrigin)
    }

    if (action.type === 'pipe') {
        let pipedNext = next

        action.recipes.forEach((recipe) => {
            pipedNext = cook(recipe, pipedNext, path, updateOrigin)
        })

        return cook(recipe.slice(1), pipedNext, path, updateOrigin)
    }

    if (action.type === 'select') {
        if (!isArray(next)) {
            throw new Error(`Calling .${action.type}() on non-array value at ${stringifyPath(path)}`) // @todo: add path in error message
        }

        next.forEach((value, index) => {
            if (action.predicate(value, index, '__@@PREDICATE_REJECT') === PREDICATE_REJECT) return

            next[index] = spreadObjectOrArray(next[index])

            cook(recipe.slice(1), next[index], [...path, index], (updater) => {
                next[index] = updater(value)
                return next[index]
            })
        })

        return next
    }

    if (action.type === 'selectAll') {
        if (!isArray(next)) {
            throw new Error(`Calling .${action.type}() on non-array value at ${stringifyPath(path)}`) // @todo: add path in error message
        }

        next.forEach((value, index) => {
            cook(recipe.slice(1), next[index], [...path, index], (updater) => {
                next[index] = updater(value)
                return next[index]
            })
        })

        return next
    }

    if (action.type === 'selectOnce') {
        if (!isArray(next)) {
            throw new Error(`Calling .${action.type}() on non-array value at ${stringifyPath(path)}`) // @todo: add path in error message
        }

        const index = next.findIndex((value, index) => action.predicate(value, index, '__@@PREDICATE_REJECT') !== PREDICATE_REJECT)

        if (index === -1) {
            throw new Error(`Cannot find value in array at ${stringifyPath(path)}`)
        }

        next[index] = spreadObjectOrArray(next[index])

        cook(recipe.slice(1), next[index], [...path, index], (updater) => {
            next[index] = updater(next[index])
            return next[index]
        })

        return next
    }

    if (action.type === 'update') {
        if (updateOrigin) {
            // @note: we must use the `updateOrigin` returned state as next state
            // otherwise we would use stale unreferenced state for any further updates.
            const updatedNext = updateOrigin(action.updater)
            cook(recipe.slice(1), updatedNext, path, updateOrigin)

            return updatedNext
        }

        if (!updateOrigin) {
            // @note: We're on root so we need to manage the state ourselves
            let catchRootStateUpdate = action.updater(next)

            cook(recipe.slice(1), catchRootStateUpdate, path, (updater) => {
                catchRootStateUpdate = updater(catchRootStateUpdate)
            })

            return catchRootStateUpdate
        }
    }

    return next
}

const _createRecipeFactory = <T, S>(executionPath: TRecipeAction[] = []) => {
    const arrayFactory: Pick<TRecipeFactoryArray<T, S>, 'select' | 'selectOnce' | 'selectAll'> = {
        select: (predicate) => {
            return _createRecipeFactory<Exclude<ReturnType<typeof predicate>, TPredicateRejection>, S>([
                ...executionPath,
                createRecipeAction({ type: 'select', predicate }),
            ])
        },
        selectOnce: (predicate) => {
            return _createRecipeFactory<Exclude<ReturnType<typeof predicate>, TPredicateRejection>, S>([
                ...executionPath,
                createRecipeAction({ type: 'selectOnce', predicate }),
            ])
        },
        selectAll: () => {
            return _createRecipeFactory<T extends (infer U)[] ? U : never, S>([...executionPath, createRecipeAction({ type: 'selectAll' })])
        },
    }

    const objectFactoryFn = ((key) => {
        return _createRecipeFactory<T extends object ? T[typeof key] : never, S>([
            ...executionPath,
            createRecipeAction({ type: 'property', key: key as string | number | symbol }),
        ])
    }) as ExtractCallSignature<TRecipeFactoryObject<T, S>>

    const objectFactory: Omit<TRecipeFactoryObject<T, S>, 'id' | 'executionPath' | 'updater' | 'cook'> = Object.assign(objectFactoryFn)

    const common: TRecipeFactoryCommon<T, S> = {
        id: `recipe(${nanoid()}).${stringifyRecipeExecutionPath(executionPath)}`,
        executionPath,
        update: (updater) => {
            return _createRecipeFactory<ReturnType<typeof updater>, S>([...executionPath, createRecipeAction({ type: 'update', updater })])
        },
        guard: (guard) => {
            return _createRecipeFactory<Exclude<ReturnType<typeof guard>, TPredicateRejection>, S>([
                ...executionPath,
                createRecipeAction({ type: 'guard', guard }),
            ])
        },
        pipe: (...recipeCreators) => {
            return _createRecipeFactory<T, S>([
                ...executionPath,
                createRecipeAction({ type: 'pipe', recipes: recipeCreators.map((creator) => creator(_createRecipeFactory<T, S>([])).executionPath) }),
            ])
        },
        cook: (state) => cook(executionPath, spreadObjectOrArray(state), []),
    }

    const factory = Object.assign(objectFactory, arrayFactory, common) as TRecipeFactory<T, S>

    return factory
}

// @note: Proxy function just to hide the executionPath parameter to the developer and avoid to have
// to declare T twice.

// @pitfalls:
// - If you reduce the type by looking up a specific value (e.g: id === '0') and you intend to
// update this same value, you'll need to cast it back to a more general type (e.g: string) because at
// this point the value will be restricted to '0'
export const createRecipeFactory = <T>() => _createRecipeFactory<T, T>()


// lethimcook.test.ts
import { createRecipeFactory } from '@/common/util/lethimcook'

describe('root update', () => {
    it('should return cooked string', () => {
        expect(
            createRecipeFactory<string>()
                .update((state) => `${state} cooked`)
                .cook('I am')
        ).toBe('I am cooked')
    })

    it('should return cooked number', () => {
        expect(
            createRecipeFactory<number>()
                .update((state) => state + 1)
                .cook(0)
        ).toBe(1)
    })

    it('should return cooked boolean', () => {
        expect(
            createRecipeFactory<boolean>()
                .update((state) => !state)
                .cook(false)
        ).toBe(true)
    })

    it('should return cooked null', () => {
        expect(
            createRecipeFactory<null>()
                .update((state) => null)
                .cook(null)
        ).toBe(null)
    })

    it('should return cooked undefined', () => {
        expect(
            createRecipeFactory<undefined>()
                .update((state) => undefined)
                .cook(undefined)
        ).toBe(undefined)
    })

    it('should return cooked array', () => {
        expect(
            createRecipeFactory<string[]>()
                .update((state) => [...state, 'd'])
                .cook(['a', 'b', 'c'])
        ).toEqual(['a', 'b', 'c', 'd'])
    })

    it('should return cooked object', () => {
        expect(
            createRecipeFactory<{ id: string; label: string }>()
                .update((state) => ({ ...state, label: 'cooked' }))
                .cook({ id: '0', label: 'uncooked' })
        ).toEqual({ id: '0', label: 'cooked' })
    })
})

describe('array update', () => {
    it('should return array with only first selecting element updated', () => {
        expect(
            createRecipeFactory<number[]>()
                .selectOnce((state, index, reject) => {
                    if (state !== 0) {
                        return reject
                    }

                    return state as number
                })
                .update((state) => state + 100)
                .cook([0, 0, 1])
        ).toEqual([100, 0, 1])
    })

    it('should return array with all selecting element updated', () => {
        expect(
            createRecipeFactory<number[]>()
                .select((state, index, reject) => {
                    if (state !== 0) {
                        return reject
                    }

                    return state as number
                })
                .update((state) => state + 100)
                .cook([0, 0, 1])
        ).toEqual([100, 100, 1])
    })

    it('should return mapped over array', () => {
        expect(
            createRecipeFactory<number[]>()
                .selectAll()
                .update((state) => state + 1)
                .cook([0, 1, 2])
        ).toEqual([1, 2, 3])
    })
})

describe('object update', () => {
    it('should return object with property x updated', () => {
        expect(
            createRecipeFactory<{ x: number; y: string }>()('x')
                .update((x) => x + 1)
                .cook({ x: 0, y: '' })
        ).toEqual({ x: 1, y: '' })
    })
})

describe('deep update', () => {
    it('should return updated object inside array', () => {
        expect(
            createRecipeFactory<{ x: number; y: string }[]>()
                .select((state, index, reject) => (state.x === 0 ? state : reject))('x')
                .update((x) => x + 1)
                .cook([
                    { x: 0, y: '' },
                    { x: 10, y: '' },
                ])
        ).toEqual([
            { x: 1, y: '' },
            { x: 10, y: '' },
        ])
    })

    it('should return updated object inside object', () => {
        expect(
            createRecipeFactory<{ obj: { x: number; y: string } }>()('obj')('x')
                .update((x) => x + 1)
                .cook({ obj: { x: 0, y: '' } })
        ).toEqual({ obj: { x: 1, y: '' } })
    })

    it('should return updated array inside array', () => {
        expect(
            createRecipeFactory<{ x: number; y: string }[][]>()
                .selectAll()
                .selectAll()
                .update((state) => ({ ...state, x: state.x + 1 }))
                .cook([
                    [
                        { x: 0, y: '' },
                        { x: 1, y: '' },
                    ],
                    [
                        { x: 0, y: '' },
                        { x: 1, y: '' },
                    ],
                ])
        ).toEqual([
            [
                { x: 1, y: '' },
                { x: 2, y: '' },
            ],
            [
                { x: 1, y: '' },
                { x: 2, y: '' },
            ],
        ])
    })

    it('should return updated array inside object', () => {
        expect(
            createRecipeFactory<{ array: { x: number; y: string }[] }>()('array')
                .selectAll()
                .update((state) => ({ ...state, x: state.x + 1 }))
                .cook({
                    array: [
                        { x: 0, y: '' },
                        { x: 1, y: '' },
                    ],
                })
        ).toEqual({
            array: [
                { x: 1, y: '' },
                { x: 2, y: '' },
            ],
        })
    })
})

describe('type guarding', () => {
    it('should update only if selecting subtype of union', () => {
        const recipe = createRecipeFactory<{ x: number } | { y: string }>()
            .guard((state, reject) => ('x' in state ? state : reject))('x')
            .update((x) => x + 1)

        expect(recipe.cook({ x: 0 })).toEqual({ x: 1 })
        expect(recipe.cook({ y: '' })).toEqual({ y: '' })
    })

    it('should update array elements that select only a subtype of the union', () => {
        expect(
            createRecipeFactory<{ array: ({ x: number } | { y: string })[] }>()('array')
                .select((state, index, reject) => ('x' in state ? state : reject))('x')
                .update((x) => x + 1)
                .cook({
                    array: [{ x: 0 }, { y: '' }],
                })
        ).toEqual({
            array: [{ x: 1 }, { y: '' }],
        })
    })
})

describe('chained update', () => {
    it('should apply update from previously updated data', () => {
        expect(
            createRecipeFactory<{ x: number }>()('x')
                .update((x) => x + 2)
                .update((x) => x * 2)
                .cook({ x: 0 })
        ).toEqual({ x: 4 })
    })

    it('should apply update from previously updated data with pipe', () => {
        expect(
            createRecipeFactory<{ x: number }>()
                .pipe((recipe) => recipe('x').update((x) => x + 1))
                .pipe((recipe) => recipe('x').update((x) => x * 2))
                .cook({ x: 1 })
        ).toEqual({ x: 4 })
    })
})

describe('composition', () => {
    const recipe = createRecipeFactory<{ x: number }>()
    const multiplyXByTwo = recipe('x').update((x) => x * 2)

    it('should apply independent updates while using the same recipe', () => {
        const first = multiplyXByTwo.cook({ x: 2 })
        const second = multiplyXByTwo.cook({ x: 4 })

        expect(first).toEqual({ x: 4 })

        expect(second).toEqual({ x: 8 })
    })
})

describe('spread reference equality check', () => {
    it('should create new object/array reference at every level before the targetted data', () => {
        type TOriginal = { obj: { array: { x: number; subobj: { y: string } }[] } }
        const original: TOriginal = {
            obj: {
                array: [{ x: 0, subobj: { y: '' } }],
            },
        }
        const cooked = createRecipeFactory<TOriginal>()('obj')('array')
            .select((state) => state)('x')
            .update((x) => x + 1)
            .cook(original)

        expect(
            [
                cooked !== original,
                cooked.obj !== original.obj,
                cooked.obj.array !== original.obj.array,
                cooked.obj.array[0] !== original.obj.array[0],
                cooked.obj.array[0].subobj === original.obj.array[0].subobj,
            ].every((boolean) => boolean)
        ).toBeTruthy()
    })
})

// letitcook.ts

'use client'
import { nanoid } from 'nanoid'

import { isArray, isObject } from '@/common/util/misc'

type TPredicateRejection = '__@@PREDICATE_REJECT'

const PREDICATE_REJECT: TPredicateRejection = '__@@PREDICATE_REJECT'

type RecipeFactoryArray<T, S> = [T] extends [(infer U)[]]
    ? {
          select: <R extends U>(predicate: (value: U, reject: TPredicateRejection, index: number) => R | TPredicateRejection) => RecipeFactory<R, S>
          selectOnce: <R extends U>(predicate: (value: U, reject: TPredicateRejection, index: number) => R | TPredicateRejection) => RecipeFactory<R, S>
          selectAll: () => RecipeFactory<U, S>
          selectAt: (index: number) => RecipeFactory<U, S>

          remove: (predicate: (value: U) => boolean) => RecipeFactory<T, S>
          removeAt: (index: number) => RecipeFactory<T, S>
      } & RecipeFactoryShared<T, S>
    : never

type RecipeFactoryObject<T, S> = [T] extends [object]
    ? {
          [K in keyof T]: RecipeFactory<T[K], S>
      } & RecipeFactoryShared<T, S>
    : never

type RecipeFactoryScalar<T, S> = RecipeFactoryShared<T, S>

type RecipeFactoryShared<T, S> = {
    // @warn: We cannot have the update as default function because if the property name clash with an internal one we won't be able to tell.
    // e.g: recipe.pipe() -> Is it a call to our internal pipe function or is it an update call to the `pipe` property of the developer's object?
    // In our proxy, we'll receive a property trap followed by an apply trap without any knowledge about the data at runtime.
    update: <R extends T>(updater: (value: T) => R) => RecipeFactory<R, S>

    instructionPath: () => TRecipeAction[]
    guard: <R extends T>(guard: (value: T, reject: TPredicateRejection) => R | TPredicateRejection) => RecipeFactory<R, S>
    pipe: <U>(fn: (recipe: RecipeFactory<T, S>) => RecipeFactory<U, S>) => RecipeFactory<T, S>
    cook: (state: S) => S
    serve: (state: S) => T
}

type InternalProperties = keyof RecipeFactoryShared<any, any> | keyof RecipeFactoryArray<any, any>

type RecipeFactory<T, S> = [T] extends [any[]] ? RecipeFactoryArray<T, S> : [T] extends [object] ? RecipeFactoryObject<T, S> : RecipeFactoryScalar<T, S>

type TPath = (string | number | symbol)[]

type TRecipeAction =
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

const createInternalPropertiesArray = (...args: InternalProperties[]) => args
const INTERNAL_CALLABLE_PROPERTIES = createInternalPropertiesArray(
    'select',
    'selectAll',
    'selectOnce',
    'selectAt',
    'remove',
    'removeAt',
    'instructionPath',
    'guard',
    'pipe',
    'update',
    'cook',
    'serve'
)

const INTERNAL_ARRAY_CALLABLE_PROPERTIES = createInternalPropertiesArray('select', 'selectOnce', 'selectAll', 'selectAt', 'remove', 'removeAt')

const createRecipeAction = (action: TRecipeAction) => action
const createRecipeActionPathArray = (...args: TRecipeAction['type'][]) => args

const stringifyPath = (path: TPath) => path.join('.')
const stringifyRecipeinstructionPath = (instructionPath: TRecipeAction[]) => {
    return instructionPath
        .map((action) => {
            if (action.type === 'property') {
                return action.key
            }

            if (createRecipeActionPathArray('select', 'selectOnce', 'selectAll').includes(action.type)) {
                return '0'
            }

            return ''
        })
        .join('.')
}

const spreadObjectOrArray = <T>(value: T): T => {
    if (isArray(value)) {
        return [...value] as T
    }

    if (isObject(value)) {
        return { ...value }
    }

    return value
}

const cook = <S>(recipe: TRecipeAction[], state: S, path: TPath): S => {
    if (recipe.length === 0) {
        return state
    }

    const action = recipe[0]
    const next = state

    if (action.type === 'property') {
        if (!isObject(next)) {
            throw new Error(`Cannot get property ${action.key.toString()} on non-object value at ${stringifyPath(path)}`) // @todo: add path in error message
        }

        const key = action.key as keyof typeof next

        next[key] = cook(recipe.slice(1), spreadObjectOrArray(next[key]), [...path, key])

        return next
    }

    if (action.type === 'guard') {
        // @warn: If the guard fails, the update cannot occur as any further calls are unsafe
        if (action.guard(next, '__@@PREDICATE_REJECT') === PREDICATE_REJECT) return next

        return cook(recipe.slice(1), next, path)
    }

    if (action.type === 'pipe') {
        let pipedNext = next

        action.recipes.forEach((recipe) => {
            pipedNext = cook(recipe, pipedNext, path)
        })

        return cook(recipe.slice(1), pipedNext, path)
    }

    if (INTERNAL_ARRAY_CALLABLE_PROPERTIES.includes(action.type)) {
        if (!isArray(next)) {
            throw new Error(`Calling .${action.type}() on non-array value at ${stringifyPath(path)}`) // @todo: add path in error message
        }

        if (action.type === 'select') {
            next.forEach((value, index) => {
                if (action.predicate(value, '__@@PREDICATE_REJECT', index) === PREDICATE_REJECT) return

                next[index] = cook(recipe.slice(1), spreadObjectOrArray(next[index]), [...path, index])
            })

            return next
        }

        if (action.type === 'selectAt') {
            next[action.index] = cook(recipe.slice(1), spreadObjectOrArray(next[action.index]), [...path, action.index])

            return next
        }

        if (action.type === 'selectAll') {
            next.forEach((value, index) => {
                next[index] = cook(recipe.slice(1), spreadObjectOrArray(next[index]), [...path, index])
            })

            return next
        }

        if (action.type === 'selectOnce') {
            const index = next.findIndex((value, index) => action.predicate(value, '__@@PREDICATE_REJECT', index) !== PREDICATE_REJECT)

            if (index === -1) {
                throw new Error(`Cannot find value in array at ${stringifyPath(path)}`)
            }

            next[index] = cook(recipe.slice(1), spreadObjectOrArray(next[index]), [...path, index])

            return next
        }

        if (action.type === 'remove') {
            return cook(recipe.slice(1), next.filter(action.predicate) as S, [...path])
        }

        if (action.type === 'removeAt') {
            return cook(recipe.slice(1), next.filter((v, index) => index !== action.index) as S, [...path])
        }
    }

    if (action.type === 'update') {
        return cook(recipe.slice(1), action.updater(next), path)
    }

    return next
}

const _createRecipeFactory = <T, S = T>(instructionPath: TRecipeAction[] = []) => {
    // @warn: We must pass `() => null` as proxy value to allow the developer to access
    // property and call so we can trap `get` and `apply`.
    const proxy: RecipeFactory<T, S> = new Proxy((() => null) as unknown as RecipeFactory<T, S>, {
        get: (target, key, receiver) => {
            return _createRecipeFactory<T, S>([...instructionPath, createRecipeAction({ type: 'property', key })])
        },

        apply: (target, thisArg, args) => {
            const propertyAction = instructionPath[instructionPath.length - 1]

            if (propertyAction.type !== 'property') {
                throw new Error(`Cannot apply function call to non-property action at ${stringifyRecipeinstructionPath(instructionPath)}`)
            }

            if (INTERNAL_CALLABLE_PROPERTIES.includes(propertyAction.key as InternalProperties)) {
                const key = propertyAction.key as InternalProperties
                const instructionPathWithoutInternalProperty = instructionPath.slice(0, -1)

                switch (key) {
                    case 'select':
                    case 'selectOnce':
                        return _createRecipeFactory<T, S>([...instructionPathWithoutInternalProperty, createRecipeAction({ type: key, predicate: args[0] })])

                    case 'selectAll':
                        return _createRecipeFactory<T, S>([...instructionPathWithoutInternalProperty, createRecipeAction({ type: key })])

                    case 'selectAt':
                        return _createRecipeFactory<T, S>([...instructionPathWithoutInternalProperty, createRecipeAction({ type: key, index: args[0] })])

                    case 'remove':
                        return _createRecipeFactory<T, S>([...instructionPathWithoutInternalProperty, createRecipeAction({ type: key, predicate: args[0] })])

                    case 'removeAt':
                        return _createRecipeFactory<T, S>([...instructionPathWithoutInternalProperty, createRecipeAction({ type: key, index: args[0] })])

                    case 'guard':
                        return _createRecipeFactory<T, S>([...instructionPathWithoutInternalProperty, createRecipeAction({ type: 'guard', guard: args[0] })])

                    case 'pipe':
                        const recipeCreators = args as Parameters<RecipeFactoryShared<T, S>['pipe']>
                        return _createRecipeFactory<T, S>([
                            ...instructionPathWithoutInternalProperty,
                            createRecipeAction({
                                type: 'pipe',
                                recipes: recipeCreators.map((creator) => creator(_createRecipeFactory<T, S>([])).instructionPath()),
                            }),
                        ])

                    case 'update':
                        return _createRecipeFactory<T, S>([...instructionPathWithoutInternalProperty, createRecipeAction({ type: 'update', updater: args[0] })])

                    case 'cook':
                        return cook([...instructionPathWithoutInternalProperty], spreadObjectOrArray(args[0]), [])

                    case 'instructionPath':
                        return instructionPathWithoutInternalProperty
                }
            }

            throw new Error(`Cannot find internal callable at ${stringifyRecipeinstructionPath(instructionPath)} for key ${propertyAction.key as string}`)
        },
    })

    return proxy
}

// @pitfalls:
// - If you reduce the type by looking up a specific value (e.g: id === '0') and you intend to
// update this same value, you'll need to cast it back to a more general type (e.g: string) because at
// this point the value will be restricted to '0'
// - Cannot have `(...).bind` syntax because it would need to be define in some kind of
// configuration at recipe creation, but then we have no way of catching at which point
// in the data traversal we'll be called because nothing happened yet, hence we'll get `any` as value type
// which is good for nothing.

// @note: Proxy function just to hide the instructionPath parameter to the developer
export const createRecipeFactory = <T>() => _createRecipeFactory<T>()

// letitcook.test.ts

import { createRecipeFactory } from '@/common/util/letitcook'

describe('root update', () => {
    it('should return cooked string', () => {
        expect(
            createRecipeFactory<string>()
                .update((state) => `${state} cooked`)
                .cook('I am')
        ).toBe('I am cooked')
    })

    it('should return cooked number', () => {
        expect(
            createRecipeFactory<number>()
                .update((state) => state + 1)
                .cook(0)
        ).toBe(1)
    })

    it('should return cooked boolean', () => {
        expect(
            createRecipeFactory<boolean>()
                .update((state) => !state)
                .cook(false)
        ).toBe(true)
    })

    it('should return cooked null', () => {
        expect(
            createRecipeFactory<null>()
                .update((state) => null)
                .cook(null)
        ).toBe(null)
    })

    it('should return cooked undefined', () => {
        expect(
            createRecipeFactory<undefined>()
                .update((state) => undefined)
                .cook(undefined)
        ).toBe(undefined)
    })

    it('should return cooked array', () => {
        expect(
            createRecipeFactory<string[]>()
                .update((state) => [...state, 'd'])
                .cook(['a', 'b', 'c'])
        ).toEqual(['a', 'b', 'c', 'd'])
    })

    it('should return cooked object', () => {
        expect(
            createRecipeFactory<{ id: string; label: string }>()
                .update((state) => ({ ...state, label: 'cooked' }))
                .cook({ id: '0', label: 'uncooked' })
        ).toEqual({ id: '0', label: 'cooked' })
    })
})

describe('array update', () => {
    it('should return array with only first selecting element updated', () => {
        expect(
            createRecipeFactory<number[]>()
                .selectOnce((state, reject) => {
                    if (state !== 0) {
                        return reject
                    }

                    return state as number
                })
                .update((state) => state + 100)
                .cook([0, 0, 1])
        ).toEqual([100, 0, 1])
    })

    it('should return array with all selecting element updated', () => {
        expect(
            createRecipeFactory<number[]>()
                .select((state, reject) => {
                    if (state !== 0) {
                        return reject
                    }

                    return state as number
                })
                .update((state) => state + 100)
                .cook([0, 0, 1])
        ).toEqual([100, 100, 1])
    })

    it('should return mapped over array', () => {
        expect(
            createRecipeFactory<number[]>()
                .selectAll()
                .update((state) => state + 1)
                .cook([0, 1, 2])
        ).toEqual([1, 2, 3])
    })

    it('should update array element at index', () => {
        expect(
            createRecipeFactory<number[]>()
                .selectAt(1)
                .update((state) => state + 1)
                .cook([0, 1, 2])
        ).toEqual([0, 2, 2])
    })

    it('should remove matching array element', () => {
        expect(
            createRecipeFactory<number[]>()
                .remove((n) => (n % 2 ? true : false))
                .cook([0, 1, 2, 3, 4])
        ).toEqual([1, 3])
    })

    it('should remove array element at index', () => {
        expect(createRecipeFactory<number[]>().removeAt(1).cook([0, 1, 2])).toEqual([0, 2])
    })
})

describe('object update', () => {
    it('should return object with property x updated', () => {
        expect(
            createRecipeFactory<{ x: number; y: string }>()
                .x.update((x) => x + 1)
                .cook({ x: 0, y: '' })
        ).toEqual({ x: 1, y: '' })
    })
})

describe('deep update', () => {
    it('should return updated object inside array', () => {
        expect(
            createRecipeFactory<{ x: number; y: string }[]>()
                .select((state, reject) => (state.x === 0 ? state : reject))
                .x.update((x) => x + 1)
                .cook([
                    { x: 0, y: '' },
                    { x: 10, y: '' },
                ])
        ).toEqual([
            { x: 1, y: '' },
            { x: 10, y: '' },
        ])
    })

    it('should return updated object inside object', () => {
        expect(
            createRecipeFactory<{ obj: { x: number; y: string } }>()
                .obj.x.update((x) => x + 1)
                .cook({ obj: { x: 0, y: '' } })
        ).toEqual({ obj: { x: 1, y: '' } })
    })

    it('should return updated array inside array', () => {
        expect(
            createRecipeFactory<{ x: number; y: string }[][]>()
                .selectAll()
                .selectAll()
                .update((state) => ({ ...state, x: state.x + 1 }))
                .cook([
                    [
                        { x: 0, y: '' },
                        { x: 1, y: '' },
                    ],
                    [
                        { x: 0, y: '' },
                        { x: 1, y: '' },
                    ],
                ])
        ).toEqual([
            [
                { x: 1, y: '' },
                { x: 2, y: '' },
            ],
            [
                { x: 1, y: '' },
                { x: 2, y: '' },
            ],
        ])
    })

    it('should return updated array inside object', () => {
        expect(
            createRecipeFactory<{ array: { x: number; y: string }[] }>()
                .array.selectAll()
                .update((state) => ({ ...state, x: state.x + 1 }))
                .cook({
                    array: [
                        { x: 0, y: '' },
                        { x: 1, y: '' },
                    ],
                })
        ).toEqual({
            array: [
                { x: 1, y: '' },
                { x: 2, y: '' },
            ],
        })
    })
})

describe('type guarding', () => {
    it('should update only if selecting subtype of union', () => {
        const recipe = createRecipeFactory<{ x: number } | { y: string }>()
            .guard((state, reject) => ('x' in state ? state : reject))
            .x.update((x) => x + 1)

        expect(recipe.cook({ x: 0 })).toEqual({ x: 1 })
        expect(recipe.cook({ y: '' })).toEqual({ y: '' })
    })

    it('should update array elements that select only a subtype of the union', () => {
        expect(
            createRecipeFactory<{ array: ({ x: number } | { y: string })[] }>()
                .array.select((state, reject) => ('x' in state ? state : reject))
                .x.update((x) => x + 1)
                .cook({
                    array: [{ x: 0 }, { y: '' }],
                })
        ).toEqual({
            array: [{ x: 1 }, { y: '' }],
        })
    })
})

describe('chained update', () => {
    it('should apply update from previously updated data', () => {
        expect(
            createRecipeFactory<{ x: number }>()
                .x.update((x) => x + 2)
                .update((x) => x * 2)
                .cook({ x: 0 })
        ).toEqual({ x: 4 })
    })

    it('should apply update from previously updated data with pipe', () => {
        expect(
            createRecipeFactory<{ x: number }>()
                .pipe((recipe) => recipe.x.update((x) => x + 1))
                .pipe((recipe) => recipe.x.update((x) => x * 2))
                .cook({ x: 1 })
        ).toEqual({ x: 4 })
    })
})

describe('composition', () => {
    const recipe = createRecipeFactory<{ x: number }>()
    const multiplyXByTwo = recipe.x.update((x) => x * 2)

    it('should apply independent updates while using the same recipe', () => {
        const first = multiplyXByTwo.cook({ x: 2 })
        const second = multiplyXByTwo.cook({ x: 4 })

        expect(first).toEqual({ x: 4 })

        expect(second).toEqual({ x: 8 })
    })
})

describe('spread reference equality check', () => {
    it('should create new object/array reference at every level before the targetted data', () => {
        type TOriginal = { obj: { array: { x: number; subobj: { y: string } }[] } }
        const original: TOriginal = {
            obj: {
                array: [{ x: 0, subobj: { y: '' } }],
            },
        }
        const cooked = createRecipeFactory<TOriginal>()
            .obj.array.select((state) => state)
            .x.update((x) => x + 1)
            .cook(original)

        expect(
            [
                cooked !== original,
                cooked.obj !== original.obj,
                cooked.obj.array !== original.obj.array,
                cooked.obj.array[0] !== original.obj.array[0],
                cooked.obj.array[0].subobj === original.obj.array[0].subobj,
            ].every((boolean) => boolean)
        ).toBeTruthy()
    })
})*/

export const none = null