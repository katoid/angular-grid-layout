import { ktdGetGridLayoutDiff } from '../grid.utils';

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
