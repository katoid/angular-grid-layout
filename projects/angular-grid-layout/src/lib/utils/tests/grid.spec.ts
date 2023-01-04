import { ktdGetGridLayoutDiff } from '../grid.utils';
import { compact } from '../react-grid-layout.utils';

describe('Grid utils', () => {

    describe('ktdGetGridLayoutDiff', () => {
        it('should calculate resize grid diff', () => {
            const a = [
                {x: 1, y: 1, w: 1, h: 1, id: '2'},
                {x: 1, y: 0, w: 1, h: 1, id: '1'},
                {x: 0, y: 1, w: 2, h: 2, id: '3'}
            ];
            const b = [
                {x: 1, y: 1, w: 1, h: 1, id: '2'},
                {x: 1, y: 0, w: 1, h: 1, id: '1'},
                {x: 0, y: 1, w: 2, h: 3, id: '3'} // h changes from 2 to 3
            ];
            expect(ktdGetGridLayoutDiff(a, b)).toEqual({3: {change: 'resize'}});
        });

        it('should calculate move items grid diff', () => {
            const a = [
                {x: 1, y: 1, w: 1, h: 1, id: '2'},
                {x: 1, y: 0, w: 1, h: 1, id: '1'},
                {x: 0, y: 1, w: 2, h: 2, id: '3'}
            ];
            const b = [
                {x: 2, y: 1, w: 1, h: 1, id: '2'}, // moves from x=1 to x=2
                {x: 1, y: 0, w: 1, h: 1, id: '1'}
                // Don't track deletions & additions for now
            ];
            expect(ktdGetGridLayoutDiff(a, b)).toEqual({2: {change: 'move'}});
        });

        it('should calculate resize and move changes on the grid', () => {
            const a = [
                {x: 1, y: 1, w: 1, h: 1, id: '2'},
                {x: 1, y: 0, w: 1, h: 1, id: '1'},
                {x: 0, y: 1, w: 2, h: 2, id: '3'}
            ];
            const b = [
                {x: 1, y: 2, w: 1, h: 1, id: '2'}, // moves from y=1 to y=2
                {x: 1, y: 0, w: 3, h: 1, id: '1'}, // w changes to 3
                {x: 0, y: 1, w: 2, h: 2, id: '3'}
            ];
            expect(ktdGetGridLayoutDiff(a, b)).toEqual({2: {change: 'move'}, 1: {change: 'resize'}});
        });
    });

});

// Custom compact test
describe('compact (custom tests)', () => {
    it('compact horizontal should not compact items vertically', () => {
        const layout = [
            {y: 0, x: 0, h: 2, w: 5, id: '1'},
            {y: 10, x: 0, h: 2, w: 1, id: '2'}
        ];
        expect(compact(layout, 'horizontal', 10)).toEqual([
            {y: 0, x: 0, h: 2, w: 5, id: '1', moved: false, static: false},
            {y: 10, x: 0, h: 2, w: 1, id: '2', moved: false, static: false}
        ]);
    });

    it('compact horizontal should move all the elements to the left as much as possible', () => {
        const cols = 6
        const layout = [
            {y: 0, x: 0, h: 2, w: 2, id: '1'},
            {y: 0, x: 2, h: 2, w: 2, id: '2'},
            {y: 0, x: 4, h: 2, w: 2, id: '3'},
            {y: 2, x: 4, h: 2, w: 2, id: '4'}
        ];

        expect(compact(layout, 'horizontal', cols)).toEqual([
            {y: 0, x: 0, h: 2, w: 2, id: '1', moved: false, static: false},
            {y: 0, x: 2, h: 2, w: 2, id: '2', moved: false, static: false},
            {y: 0, x: 4, h: 2, w: 2, id: '3', moved: false, static: false},
            {y: 2, x: 0, h: 2, w: 2, id: '4', moved: false, static: false}
        ]);
    });

    it('compact horizontal should put overflowing-right elements as bottom needed without colliding and as left as possible', () => {
        const cols = 6
        const layout = [
            {y: 0, x: 0, h: 2, w: 2, id: '1'},
            {y: 0, x: 2, h: 2, w: 2, id: '2'},
            {y: 0, x: 4, h: 2, w: 2, id: '3'},
            {y: -2, x: -2, h: 2, w: 2, id: '4'}
        ];

        expect(compact(layout, 'horizontal', cols)).toEqual([
            {y: 0, x: 2, h: 2, w: 2, id: '1', moved: false, static: false},
            {y: 0, x: 4, h: 2, w: 2, id: '2', moved: false, static: false},
            {y: 2, x: 0, h: 2, w: 2, id: '3', moved: false, static: false},
            {y: 0, x: 0, h: 2, w: 2, id: '4', moved: false, static: false},
        ]);
    });
})
