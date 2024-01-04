import { createInternalPropertiesArray } from './util'

export const INTERNAL_NO_STATE_SYMBOL = Symbol('__@@NO_STATE')
export const PREDICATE_REJECT_SYMBOL = Symbol('__@@PREDICATE_REJECT')

export const INTERNAL_ARRAY_CALLABLE_PROPERTIES = createInternalPropertiesArray('select', 'selectOnce', 'selectAll', 'selectAt', 'remove', 'removeAt')
