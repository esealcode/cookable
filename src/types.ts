export type TPredicateRejection = '__@@PREDICATE_REJECT'

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