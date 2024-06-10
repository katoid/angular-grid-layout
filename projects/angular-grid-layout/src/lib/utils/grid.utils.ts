import {
    compact,
    compactLayout,
    CompactType,
    getFirstCollision,
    Layout,
    LayoutItem,
    moveElement
} from './react-grid-layout.utils';
import { KtdDraggingData, KtdGridCfg, KtdGridCompactType, KtdGridItemRect, KtdGridLayout, KtdGridLayoutItem } from '../grid.definitions';
import { ktdPointerClientX, ktdPointerClientY } from './pointer.utils';
import { KtdDictionary } from '../../types';

/** Tracks items by id. This function is mean to be used in conjunction with the ngFor that renders the 'ktd-grid-items' */
export function ktdTrackById(index: number, item: {id: string}) {
    return item.id;
}

/** Given a layout, the gridHeight and the gap return the resulting rowHeight */
export function ktdGetGridItemRowHeight(layout: KtdGridLayout, gridHeight: number, gap: number): number {
    const numberOfRows = layout.reduce((acc, cur) => Math.max(acc, Math.max(cur.y + cur.h, 0)), 0);
    const gapTotalHeight = (numberOfRows - 1) * gap;
    const gridHeightMinusGap = gridHeight - gapTotalHeight;
    return gridHeightMinusGap / numberOfRows;
}

/**
 * Call react-grid-layout utils 'compact()' function and return the compacted layout.
 * @param layout to be compacted.
 * @param compactType type of compaction.
 * @param cols number of columns of the grid.
 */
export function ktdGridCompact(layout: KtdGridLayout, compactType: KtdGridCompactType, cols: number): KtdGridLayout {
    return compact(layout, compactType, cols)
        // Prune react-grid-layout compact extra properties.
        .map(item => ({ id: item.id, x: item.x, y: item.y, w: item.w, h: item.h, minW: item.minW, minH: item.minH, maxW: item.maxW, maxH: item.maxH, data: item.data }));
}

function screenXToGridX(screenXPos: number, cols: number, width: number, gap: number): number {
    const widthMinusGaps = width - (gap * (cols - 1));
    const itemWidth = widthMinusGaps / cols;
    const widthMinusOneItem = width - itemWidth;
    const colWidthWithGap = widthMinusOneItem / (cols - 1);
    return Math.round(screenXPos / colWidthWithGap);
}

function screenYToGridY(screenYPos: number, rowHeight: number, height: number, gap: number): number {
    return Math.round(screenYPos / (rowHeight + gap));
}

function screenWidthToGridWidth(gridScreenWidth: number, cols: number, width: number, gap: number): number {
    const widthMinusGaps = width - (gap * (cols - 1));
    const itemWidth = widthMinusGaps / cols;
    const gridScreenWidthMinusFirst = gridScreenWidth - itemWidth;
    return Math.round(gridScreenWidthMinusFirst / (itemWidth + gap)) + 1;
}

function screenHeightToGridHeight(gridScreenHeight: number, rowHeight: number, height: number, gap: number): number {
    const gridScreenHeightMinusFirst = gridScreenHeight - rowHeight;
    return Math.round(gridScreenHeightMinusFirst / (rowHeight + gap)) + 1;
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
 * @param item grid item that is been dragged
 * @param config current grid configuration
 * @param compactionType type of compaction that will be performed
 * @param draggingData contains all the information about the drag
 */
export function ktdGridItemDragging(
    item: KtdGridLayoutItem,
    config: KtdGridCfg,
    compactionType: CompactType,
    draggingData: KtdDraggingData
): { layout: KtdGridLayoutItem[]; draggedItemPos: KtdGridItemRect, draggedLayoutItem: KtdGridLayoutItem } {
    const {
        pointerDownEvent,
        pointerDragEvent,
        gridElemClientRect,
        dragElemClientRect,
        scrollDifference,
        draggingFromOutside
    } = draggingData;

    const tmpGridItemId = 'tmp-dragging-item';
    const gridItemId = draggingFromOutside ? tmpGridItemId + item.id : item.id;

    const clientStartX = ktdPointerClientX(pointerDownEvent);
    const clientStartY = ktdPointerClientY(pointerDownEvent);
    const clientX = ktdPointerClientX(pointerDragEvent);
    const clientY = ktdPointerClientY(pointerDragEvent);

    const offsetX = clientStartX - dragElemClientRect.left;
    const offsetY = clientStartY - dragElemClientRect.top;

    // Grid element positions taking into account the possible scroll total difference from the beginning.
    const gridElementLeftPosition = gridElemClientRect.left + scrollDifference.left;
    const gridElementTopPosition = gridElemClientRect.top + scrollDifference.top;

    // Calculate position relative to the grid element.
    const gridRelXPos = clientX - gridElementLeftPosition - offsetX;
    const gridRelYPos = clientY - gridElementTopPosition - offsetY;

    const rowHeightInPixels = config.rowHeight === 'fit'
        ? ktdGetGridItemRowHeight(config.layout, config.height ?? gridElemClientRect.height, config.gap)
        : config.rowHeight;

    // Get layout item position
    const layoutItem: KtdGridLayoutItem = {
        ...item,
        id: gridItemId,
        x: screenXToGridX(gridRelXPos , config.cols, gridElemClientRect.width, config.gap),
        y: screenYToGridY(gridRelYPos, rowHeightInPixels, gridElemClientRect.height, config.gap)
    };

    // Correct the values if they overflow, since 'moveElement' function doesn't do it
    layoutItem.x = Math.max(0, layoutItem.x);
    layoutItem.y = Math.max(0, layoutItem.y);
    if (layoutItem.x + layoutItem.w > config.cols) {
        layoutItem.x = Math.max(0, config.cols - layoutItem.w);
    }
    // Parse to LayoutItem array data in order to use 'react.grid-layout' utils
    const layoutItems: LayoutItem[] = config.layout;
    const draggedLayoutItem = draggingFromOutside ? {
        ...item,
        id: gridItemId
    } : layoutItems.find(item => item.id === gridItemId)!;

    let newLayoutItems: LayoutItem[] = moveElement(
        layoutItems,
        draggedLayoutItem,
        layoutItem.x,
        layoutItem.y,
        true,
        config.preventCollision,
        compactionType,
        config.cols
    );

    if (draggingFromOutside) {
        newLayoutItems = compactLayout(newLayoutItems, layoutItem, compactionType, config.cols);
        const newLayoutItem = newLayoutItems.find(item => item.id === gridItemId)!;
        newLayoutItems = newLayoutItems.filter((item) => item.id !== gridItemId);

        return {
            layout: newLayoutItems,
            draggedItemPos: {
                top: gridRelYPos,
                left: gridRelXPos,
                width: dragElemClientRect.width,
                height: dragElemClientRect.height,
            },
            draggedLayoutItem: {
                ...newLayoutItem,
                id: newLayoutItem.id.replace(tmpGridItemId, '')
            },
        };
    }

    newLayoutItems = compact(newLayoutItems, compactionType, config.cols);

    return {
        layout: newLayoutItems,
        draggedItemPos: {
            top: gridRelYPos,
            left: gridRelXPos,
            width: dragElemClientRect.width,
            height: dragElemClientRect.height,
        },
        draggedLayoutItem: draggedLayoutItem,
    };
}

/**
 * Given the grid config & layout data and the current drag position & information, returns the corresponding layout and drag item position
 * @param item grid item that is been dragged
 * @param config current grid configuration
 * @param compactionType type of compaction that will be performed
 * @param draggingData contains all the information about the drag
 */
export function ktdGridItemResizing(item: KtdGridLayoutItem, config: KtdGridCfg, compactionType: CompactType, draggingData: KtdDraggingData): { layout: KtdGridLayoutItem[]; draggedItemPos: KtdGridItemRect, draggedLayoutItem: KtdGridLayoutItem } {
    const {pointerDownEvent, pointerDragEvent, gridElemClientRect, dragElemClientRect, scrollDifference} = draggingData;
    const gridItemId = item.id;

    const clientStartX = ktdPointerClientX(pointerDownEvent);
    const clientStartY = ktdPointerClientY(pointerDownEvent);
    const clientX = ktdPointerClientX(pointerDragEvent);
    const clientY = ktdPointerClientY(pointerDragEvent);

    // Get the difference between the mouseDown and the position 'right' of the resize element.
    const resizeElemOffsetX = dragElemClientRect.width - (clientStartX - dragElemClientRect.left);
    const resizeElemOffsetY = dragElemClientRect.height - (clientStartY - dragElemClientRect.top);

    const draggingElemPrevItem = config.layout.find(item => item.id === gridItemId)!;
    const width = clientX + resizeElemOffsetX - (dragElemClientRect.left + scrollDifference.left);
    const height = clientY + resizeElemOffsetY - (dragElemClientRect.top + scrollDifference.top);

    const rowHeightInPixels = config.rowHeight === 'fit'
        ? ktdGetGridItemRowHeight(config.layout, config.height ?? gridElemClientRect.height, config.gap)
        : config.rowHeight;

    // Get layout item grid position
    const layoutItem: KtdGridLayoutItem = {
        ...draggingElemPrevItem,
        w: screenWidthToGridWidth(width, config.cols, gridElemClientRect.width, config.gap),
        h: screenHeightToGridHeight(height, rowHeightInPixels, gridElemClientRect.height, config.gap)
    };

    layoutItem.w = limitNumberWithinRange(layoutItem.w, item.minW ?? layoutItem.minW, item.maxW ?? layoutItem.maxW);
    layoutItem.h = limitNumberWithinRange(layoutItem.h, item.minH ?? layoutItem.minH, item.maxH ?? layoutItem.maxH);

    if (layoutItem.x + layoutItem.w > config.cols) {
        layoutItem.w = Math.max(1, config.cols - layoutItem.x);
    }

    if (config.preventCollision) {
        const maxW = layoutItem.w;
        const maxH = layoutItem.h;

        let colliding = hasCollision(config.layout, layoutItem);
        let shrunkDimension: 'w' | 'h' | undefined;

        while (colliding) {
            shrunkDimension = getDimensionToShrink(layoutItem, shrunkDimension);
            layoutItem[shrunkDimension]--;
            colliding = hasCollision(config.layout, layoutItem);
        }

        if (shrunkDimension === 'w') {
            layoutItem.h = maxH;

            colliding = hasCollision(config.layout, layoutItem);
            while (colliding) {
                layoutItem.h--;
                colliding = hasCollision(config.layout, layoutItem);
            }
        }
        if (shrunkDimension === 'h') {
            layoutItem.w = maxW;

            colliding = hasCollision(config.layout, layoutItem);
            while (colliding) {
                layoutItem.w--;
                colliding = hasCollision(config.layout, layoutItem);
            }
        }

    }

    const newLayoutItems: LayoutItem[] = config.layout.map((item) => {
        return item.id === gridItemId ? layoutItem : item;
    });

    return {
        layout: compact(newLayoutItems, compactionType, config.cols),
        draggedItemPos: {
            top: dragElemClientRect.top - gridElemClientRect.top,
            left: dragElemClientRect.left - gridElemClientRect.left,
            width,
            height,
        },
        draggedLayoutItem: layoutItem,
    };
}

function hasCollision(layout: Layout, layoutItem: LayoutItem): boolean {
    return !!getFirstCollision(layout, layoutItem);
}

function getDimensionToShrink(layoutItem, lastShrunk): 'w' | 'h' {
    if (layoutItem.h <= 1) {
        return 'w';
    }
    if (layoutItem.w <= 1) {
        return 'h';
    }

    return lastShrunk === 'w' ? 'h' : 'w';
}

/**
 * Given the current number and min/max values, returns the number within the range
 * @param num can be any numeric value
 * @param min minimum value of range
 * @param max maximum value of range
 */
function limitNumberWithinRange(num: number, min: number = 1, max: number = Infinity) {
    return Math.min(Math.max(num, min < 1 ? 1 : min), max);
}

/** Returns true if both item1 and item2 KtdGridLayoutItems are equivalent. */
export function ktdGridItemLayoutItemAreEqual(item1: KtdGridLayoutItem, item2: KtdGridLayoutItem): boolean {
    return item1.id === item2.id
        && item1.x === item2.x
        && item1.y === item2.y
        && item1.w === item2.w
        && item1.h === item2.h
}
