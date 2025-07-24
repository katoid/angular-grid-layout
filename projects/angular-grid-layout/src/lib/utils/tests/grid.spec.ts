import { ktdGetGridLayoutDiff } from '../grid.utils';
import { KtdMoveMultipleElements } from '../react-grid-layout-multiple.utils';
import { compact, Layout } from '../react-grid-layout.utils';

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

/// Multiple items movements
describe('Move multiple elements affecting other items', () => {

    function compactAndMoveMultiple(
        layout,
        items,
        isUserAction,
        compactType,
        cols
    ) {
        let l: Layout = compact(
            KtdMoveMultipleElements(
                layout,
                items,
                isUserAction,
                compactType,
                cols
            ),
            compactType,
            cols
        );
        l = l.map(lItem => {
            lItem.static = false;
            return lItem;
        });
        return compact(l,compactType,cols);
    }

    it('Test the need to order the selected static elements to move in the ktdMoveMultipleElements function', () => {
        const layout = [
            {id:"1",x:9,y:0,w:8,h:3,static:true},
            {id:"2",x:17,y:0,w:7,h:3,static:true},
            {id:"3",x:9,y:3,w:8,h:3,static:true},
            {id:"4",x:17,y:3,w:7,h:3,static:true},
            {id:"5",x:1,y:6,w:15,h:1},
            {id:"6",x:16,y:6,w:15,h:1},
            {id:"7",x:1,y:7,w:7,h:3},
            {id:"8",x:24,y:7,w:7,h:3}
        ];
        const layoutItems = [
            {l:layout[0],x:9,y:7},
            {l:layout[1],x:17,y:7},
            {l:layout[2],x:9,y:10},
            {l:layout[3],x:17,y:10}
        ]
        expect(
            compactAndMoveMultiple(
                layout,
                layoutItems,
                true,
                'vertical',
                30
            )
        ).toEqual([
            {id:"1", x:9, y:1, w:8, h:3, moved: false, static: false},
            {id:"2", x:17, y:1, w:7, h:3, moved: false, static: false},
            {id:"3", x:9, y:4, w:8, h:3, moved: false, static: false},
            {id:"4", x:17, y:4, w:7, h:3, moved: false, static: false},
            {id:"5", x:1, y:0, w:15, h:1, moved: false, static: false},
            {id:"6", x:16, y:0, w:15, h:1, moved: false, static: false},
            {id:"7", x:1, y:1, w:7, h:3, moved: false, static: false},
            {id:"8", x:24, y:1, w:7, h:3, moved: false, static: false}
        ]);
    });


    it('Test that the pruning in resolveCompactCollision doesn\'t result in an unexpected compacted grid', () => {
        const layout = [
            {id: '0', x: 1, y: 0, w: 38, h: 1},
            {id: '1', x: 1, y: 1, w: 15, h: 1},
            {id: '2', x: 1, y: 2, w: 15, h: 1},
            {id: '3', x: 16, y: 1, w: 8, h: 2, static:true},
            {id: '4', x: 24, y: 1, w: 7, h: 2, static:true},
            {id: '5', x: 16, y: 3, w: 8, h: 3, static:true},
            {id: '6', x: 24, y: 3, w: 15, h: 1}
        ];
        const layoutItems = [
            {l:layout[3],x:16,y:0},
            {l:layout[4],x:24,y:0},
            {l:layout[5],x:16,y:2}
        ]
        expect(
            compactAndMoveMultiple(
                layout,
                layoutItems,
                true,
                'vertical',
                40
            )
        ).toEqual([
            {id:"0", x:1, y:5, w:38, h:1, moved: false, static: false},
            {id:"1", x:1, y:6, w:15, h:1, moved: false, static: false},
            {id:"2", x:1, y:7, w:15, h:1, moved: false, static: false},
            {id:"3", x:16, y:0, w:8, h:2, moved: false, static: false},
            {id:"4", x:24, y:0, w:7, h:2, moved: false, static: false},
            {id:"5", x:16, y:2, w:8, h:3, moved: false, static: false},
            {id:"6", x:24, y:6, w:15, h:1, moved: false, static: false}
        ]);
    });

    it('Test the need to order static elements by y+h, when there is more than one, in the compact function', () => {
        const layout = [
            {id: '0', x: 1, y: 0, w: 38, h: 1},
            {id: '1', x: 1, y: 1, w: 15, h: 1},
            {id: '2', x: 1, y: 2, w: 15, h: 1},
            {id: '3', x: 16, y: 1, w: 8, h: 4, static:true},
            {id: '4', x: 24, y: 1, w: 7, h: 2, static:true},
            {id: '5', x: 16, y: 5, w: 8, h: 3, static:true},
            {id: '6', x: 24, y: 3, w: 15, h: 1}
        ];
        const layoutItems = [
            {l:layout[3],x:16,y:0},
            {l:layout[4],x:24,y:0},
            {l:layout[5],x:16,y:4}
        ]
        expect(
            compactAndMoveMultiple(
                layout,
                layoutItems,
                true,
                'vertical',
                40
            )
        ).toEqual([
            {id:"0", x:1, y:7, w:38, h:1, moved: false, static: false},
            {id:"1", x:1, y:8, w:15, h:1, moved: false, static: false},
            {id:"2", x:1, y:9, w:15, h:1, moved: false, static: false},
            {id:"3", x:16, y:0, w:8, h:4, moved: false, static: false},
            {id:"4", x:24, y:0, w:7, h:2, moved: false, static: false},
            {id:"5", x:16, y:4, w:8, h:3, moved: false, static: false},
            {id:"6", x:24, y:8, w:15, h:1, moved: false, static: false}
        ]);
    });
});
