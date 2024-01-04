import { createRecipeFactory } from './factory'

describe('root update', () => {
    it('should return cooked string', () => {
        expect(
            createRecipeFactory<string>()
                .updater((state) => `${state} cooked`)
                .cook('I am')
        ).toBe('I am cooked')
    })

    it('should return cooked number', () => {
        expect(
            createRecipeFactory<number>()
                .updater((state) => state + 1)
                .cook(0)
        ).toBe(1)
    })

    it('should return cooked boolean', () => {
        expect(
            createRecipeFactory<boolean>()
                .updater((state) => !state)
                .cook(false)
        ).toBe(true)
    })

    it('should return cooked null', () => {
        expect(
            createRecipeFactory<null>()
                .updater((state) => null)
                .cook(null)
        ).toBe(null)
    })

    it('should return cooked undefined', () => {
        expect(
            createRecipeFactory<undefined>()
                .updater((state) => undefined)
                .cook(undefined)
        ).toBe(undefined)
    })

    it('should return cooked number | undefined', () => {
        expect(createRecipeFactory<number | undefined>(undefined).updater(v => 10).cook()).toEqual(10)
    })

    it('should return cooked array', () => {
        expect(
            createRecipeFactory<string[]>()
                .updater((state) => [...state, 'd'])
                .cook(['a', 'b', 'c'])
        ).toEqual(['a', 'b', 'c', 'd'])
    })

    it('should return cooked object', () => {
        expect(
            createRecipeFactory<{ id: string; label: string }>()
                .updater((state) => ({ ...state, label: 'cooked' }))
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
                .updater((state) => state + 100)
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
                .updater((state) => state + 100)
                .cook([0, 0, 1])
        ).toEqual([100, 100, 1])
    })

    it('should return mapped over array', () => {
        expect(
            createRecipeFactory<number[]>()
                .selectAll()
                .updater((state) => state + 1)
                .cook([0, 1, 2])
        ).toEqual([1, 2, 3])
    })

    it('should update array element at index', () => {
        expect(
            createRecipeFactory<number[]>()
                .selectAt(1)
                .updater((state) => state + 1)
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
                ('x').updater((x) => x + 1)
                .cook({ x: 0, y: '' })
        ).toEqual({ x: 1, y: '' })
    })
})

describe('deep update', () => {
    it('should return updated object inside array', () => {
        expect(
            createRecipeFactory<{ x: number; y: string }[]>()
                .select((state, reject) => (state.x === 0 ? state : reject))
                ('x').updater((x) => x + 1)
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
                ('obj')('x').updater((x) => x + 1)
                .cook({ obj: { x: 0, y: '' } })
        ).toEqual({ obj: { x: 1, y: '' } })
    })

    it('should return updated array inside array', () => {
        expect(
            createRecipeFactory<{ x: number; y: string }[][]>()
                .selectAll()
                .selectAll()
                .updater((state) => ({ ...state, x: state.x + 1 }))
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
                ('array').selectAll()
                .updater((state) => ({ ...state, x: state.x + 1 }))
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
            ('x').updater((x) => x + 1)

        expect(recipe.cook({ x: 0 })).toEqual({ x: 1 })
        expect(recipe.cook({ y: '' })).toEqual({ y: '' })
    })

    it('should update array elements that select only a subtype of the union', () => {
        expect(
            createRecipeFactory<{ array: ({ x: number } | { y: string })[] }>()
                ('array').select((state, reject) => ('x' in state ? state : reject))
                ('x').updater((x) => x + 1)
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
                ('x').updater((x) => x + 2)
                .updater((x) => x * 2)
                .cook({ x: 0 })
        ).toEqual({ x: 4 })
    })

    it('should apply update from previously updated data with pipe', () => {
        expect(
            createRecipeFactory<{ x: number }>()
                .pipe((recipe) => recipe('x').updater((x) => x + 1))
                .pipe((recipe) => recipe('x').updater((x) => x * 2))
                .cook({ x: 1 })
        ).toEqual({ x: 4 })
    })
})

describe('composition', () => {
    const recipe = createRecipeFactory<{ x: number }>()
    const multiplyXByTwo = recipe('x').updater((x) => x * 2)

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
            ('obj')('array').select((state) => state)
            ('x').updater((x) => x + 1)
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

describe('bi-directional state input feeding support', () => {
    it('should update state passed as input in recipe factory call', () => {
        expect(createRecipeFactory({ x: 1 })('x').updater(x => x * 2).cook()).toEqual({ x: 2 })
    })

    it('should update state passed as input to cook call', () => {
        expect(createRecipeFactory<{ x: number }>()('x').updater(x => x * 2).cook({ x: 1 })).toEqual({ x: 2 })
    })
})

describe('misc', () => {
    it('should return id with proper array key indices', () => {
        expect(createRecipeFactory<{ array: { x: number }[][][] }>()('array').selectAll().selectAll().selectAll()('x').id(0, 1, 2)).toBe('array.0.1.2.x')
    })
})