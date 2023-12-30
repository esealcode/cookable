import { TPath, TRecipeAction, TInternalCallableActionType } from './types'

export const isArray = <T>(value: unknown): value is Array<T> => {
    if (Array.isArray(value)) {
        return true
    }

    return false
}

export const isObject = <T>(value: T): value is { [K in keyof T]: T[K] } => {
    if (value === null) {
        return false
    }
    return typeof value === 'function' || typeof value === 'object'
}

export const createRecipeAction = (action: TRecipeAction) => action
export const createRecipeActionPathArray = (...args: TRecipeAction['type'][]) => args

export const stringifyPath = (path: TPath) => path.join('.')
export const stringifyRecipeInstructionPath = (instructionPath: TRecipeAction[]) => {
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

export const spreadObjectOrArray = <T>(value: T): T => {
    if (isArray(value)) {
        return [...value] as T
    }

    if (isObject(value)) {
        return { ...value }
    }

    return value
}

export const createInternalPropertiesArray = (...args: TInternalCallableActionType[]) => args