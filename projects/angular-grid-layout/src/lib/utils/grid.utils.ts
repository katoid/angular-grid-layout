import { compact, CompactType, LayoutItem, moveElement } from './react-grid-layout.utils';
import { KtdGridCfg, KtdGridCompactType, KtdGridItemRect, KtdGridLayout, KtdGridLayoutItem } from '../grid.definitions';
import { ktdPointerClientX, ktdPointerClientY } from './pointer.utils';
import { KtdDictionary } from '../../types';

/** Tracks items by id. This function is mean to be used in conjunction with the ngFor that renders the 'ktd-grid-items' */
export function ktdTrackById(index: number, item: {id: string}) {
    return item.id;
}

/**
 * Call react-grid-layout utils 'compact()' function and return the compacted layout.
 * @param layout to be compacted.
 * @param compactType, type of compaction.
 * @param cols, number of columns of the grid.
 */
export function ktdGridCompact(layout: KtdGridLayout, compactType: KtdGridCompactType, cols: number): KtdGridLayout {
    return compact(layout, compactType, cols)
        // Prune react-grid-layout compact extra properties.
        .map(item => ({id: item.id, x: item.x, y: item.y, w: item.w, h: item.h}));
}

function screenXPosToGridValue(screenXPos: number, cols: number, width: number): number {
    return Math.round((screenXPos * cols) / width);
}

function screenYPosToGridValue(screenYPos: number, rowHeight: number, height: number): number {
    return Math.round(screenYPos / rowHeight);
}

/** Returns a Dictionary where the key is the id and the value is the change applied to that item. If no changes Dictionary is empty. */
export function ktdGetGridLayoutDiff(gridLayoutA: KtdGridLayoutItem[], gridLayoutB: KtdGridLayoutItem[]): KtdDictionary<{ change: 'move' | 'resize' | 'moveresize' }> {
    const diff: KtdDictionary<{ change: 'move' | 'resize' | 'moveresize' }> = {};

    gridLayoutA.forEach(itemA => {
        const itemB = gridLayoutB.find(_itemB => _itemB.id === itemA.id);
        if (itemB != null) {
            const posChanged = itemA.x !== itemB.x || itemA.y !== itemB.y;
            const sizeChanged = itemA.w !== itemB.w || itemA.h !== itemB.h;
            const change: 'move' | 'resize' | 'moveresize' | null = posChanged && sizeChanged ? 'moveresize' : posChanged ? 'move' : sizeChanged ? 'resize' : null;
            if (change) {
                diff[itemB.id] = {change};
            }
        }
    });
    return diff;
}

/**
 * Given the grid config & layout data and the current drag position & information, returns the corresponding layout and drag item position
 * @param gridItemId id of the grid item that is been dragged
 * @param config current grid configuration
 * @param compactionType type of compaction that will be performed
 * @param draggingData contains all the information about the drag
 */
export function ktdGridItemDragging(gridItemId: string, config: KtdGridCfg, compactionType: CompactType, draggingData: { pointerDownEvent: MouseEvent | TouchEvent, pointerDragEvent: MouseEvent | TouchEvent, parentElemClientRect: ClientRect, dragElemClientRect: ClientRect }): { layout: KtdGridLayoutItem[]; draggedItemPos: KtdGridItemRect } {
    const {pointerDownEvent, pointerDragEvent, parentElemClientRect, dragElemClientRect} = draggingData;

    const draggingElemPrevItem = config.layout.find(item => item.id === gridItemId)!;

    const clientStartX = ktdPointerClientX(pointerDownEvent);
    const clientStartY = ktdPointerClientY(pointerDownEvent);
    const clientX = ktdPointerClientX(pointerDragEvent);
    const clientY = ktdPointerClientY(pointerDragEvent);

    const offsetX = clientStartX - dragElemClientRect.left;
    const offsetY = clientStartY - dragElemClientRect.top;

    const gridRelXPos = clientX - parentElemClientRect.left - offsetX;
    const gridRelYPos = clientY - parentElemClientRect.top - offsetY;

    // Get layout item position
    const layoutItem: KtdGridLayoutItem = {
        ...draggingElemPrevItem,
        x: screenXPosToGridValue(gridRelXPos, config.cols, parentElemClientRect.width),
        y: screenYPosToGridValue(gridRelYPos, config.rowHeight, parentElemClientRect.height)
    };
    // console.log({clientX: (pointerDragEvent as MouseEvent).clientX, clientY: (pointerDragEvent as MouseEvent).clientY, pageX: (pointerDragEvent as MouseEvent).pageX, pageY: (pointerDragEvent as MouseEvent).pageY});
    // console.log({clientX, clientY, offsetX, offsetY, gridRelXPos, gridRelYPos, parentElemClientRect, layoutItem});

    // Correct the values if they overflow, since 'moveElement' function doesn't do it
    layoutItem.x = Math.max(0, layoutItem.x);
    layoutItem.y = Math.max(0, layoutItem.y);
    if (layoutItem.x + layoutItem.w > config.cols) {
        layoutItem.x = Math.max(0, config.cols - layoutItem.w);
    }

    // Parse to LayoutItem array data in order to use 'react.grid-layout' utils
    const layoutItems: LayoutItem[] = config.layout;
    const draggedLayoutItem: LayoutItem = layoutItems.find(item => item.id === gridItemId)!;

    let newLayoutItems: LayoutItem[] = moveElement(
        layoutItems,
        draggedLayoutItem,
        layoutItem.x,
        layoutItem.y,
        true,
        false,
        compactionType,
        config.cols
    );

    newLayoutItems = compact(newLayoutItems, compactionType, config.cols);

    return {
        layout: newLayoutItems,
        draggedItemPos: {
            top: gridRelYPos,
            left: gridRelXPos,
            width: dragElemClientRect.width,
            height: dragElemClientRect.height,
        }
    };
}

/**
 * Given the grid config & layout data and the current drag position & information, returns the corresponding layout and drag item position
 * @param gridItemId id of the grid item that is been dragged
 * @param config current grid configuration
 * @param compactionType type of compaction that will be performed
 * @param draggingData contains all the information about the drag
 */
export function ktdGridItemResizing(gridItemId: string, config: KtdGridCfg, compactionType: CompactType, draggingData: { pointerDownEvent: MouseEvent | TouchEvent, pointerDragEvent: MouseEvent | TouchEvent, parentElemClientRect: ClientRect, dragElemClientRect: ClientRect }): { layout: KtdGridLayoutItem[]; draggedItemPos: KtdGridItemRect } {
    const {pointerDownEvent, pointerDragEvent, parentElemClientRect, dragElemClientRect} = draggingData;

    const clientStartX = ktdPointerClientX(pointerDownEvent);
    const clientStartY = ktdPointerClientY(pointerDownEvent);
    const clientX = ktdPointerClientX(pointerDragEvent);
    const clientY = ktdPointerClientY(pointerDragEvent);

    // Get the difference between the mouseDown and the position 'right' of the resize element.
    const resizeElemOffsetX = dragElemClientRect.width - (clientStartX - dragElemClientRect.left);
    const resizeElemOffsetY = dragElemClientRect.height - (clientStartY - dragElemClientRect.top);

    const draggingElemPrevItem = config.layout.find(item => item.id === gridItemId)!;
    const width = clientX - dragElemClientRect.left + resizeElemOffsetX;
    const height = clientY - dragElemClientRect.top + resizeElemOffsetY;

    // Get layout item grid position
    const layoutItem: KtdGridLayoutItem = {
        ...draggingElemPrevItem,
        w: screenXPosToGridValue(width, config.cols, parentElemClientRect.width),
        h: screenYPosToGridValue(height, config.rowHeight, parentElemClientRect.height)
    };

    layoutItem.w = Math.max(1, layoutItem.w);
    layoutItem.h = Math.max(1, layoutItem.h);
    if (layoutItem.x + layoutItem.w > config.cols) {
        layoutItem.w = Math.max(1, config.cols - layoutItem.x);
    }

    const newLayoutItems: LayoutItem[] = config.layout.map((item) => {
        return item.id === gridItemId ? layoutItem : item;
    });

    return {
        layout: compact(newLayoutItems, compactionType, config.cols),
        draggedItemPos: {
            top: dragElemClientRect.top - parentElemClientRect.top,
            left: dragElemClientRect.left - parentElemClientRect.left,
            width,
            height,
        }
    };
}
