import { isArray, isObject, spreadObjectOrArray, stringifyPath, stringifyRecipeInstructionPath } from './util'
import { TPath, TRecipeAction } from './types.factory'
import { PREDICATE_REJECT_SYMBOL, INTERNAL_ARRAY_CALLABLE_PROPERTIES } from './constant'

export const cook = <S>(recipe: TRecipeAction[], state: S, path: TPath): S => {
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
        if (action.guard(next, PREDICATE_REJECT_SYMBOL) === PREDICATE_REJECT_SYMBOL) return next

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
                if (action.predicate(value, PREDICATE_REJECT_SYMBOL, index) === PREDICATE_REJECT_SYMBOL) return

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
            const index = next.findIndex((value, index) => action.predicate(value, PREDICATE_REJECT_SYMBOL, index) !== PREDICATE_REJECT_SYMBOL)

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