import { TPredicateRejection } from './types'
import { createInternalPropertiesArray } from './util'

export const PREDICATE_REJECT: TPredicateRejection = '__@@PREDICATE_REJECT'

export const INTERNAL_ARRAY_CALLABLE_PROPERTIES = createInternalPropertiesArray('select', 'selectOnce', 'selectAll', 'selectAt', 'remove', 'removeAt')
