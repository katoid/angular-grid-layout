import { InjectionToken } from '@angular/core';
import { CompactType } from './utils/react-grid-layout.utils';
import { KtdClientRect } from './utils/client-rect';

export interface KtdGridLayoutItem {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
}

export type KtdGridCompactType = CompactType;


export interface KtdGridBackgroundCfg {
    show: 'never' | 'always' | 'whenDragging';
    borderColor?: string;
    gapColor?: string;
    rowColor?: string;
    columnColor?: string;
    borderWidth?: number;
}

export interface KtdGridCfg {
    cols: number;
    rowHeight: number | 'fit'; // row height in pixels
    height?: number | null;
    layout: KtdGridLayoutItem[];
    preventCollision: boolean;
    gap: number;
}

export type KtdGridLayout = KtdGridLayoutItem[];

// TODO: Remove this interface. If can't remove, move and rename this interface in the core module or similar.
export interface KtdGridItemRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export interface KtdGridItemRenderData<T = number | string> {
    id: string;
    top: T;
    left: T;
    width: T;
    height: T;
}

/**
 * We inject a token because of the 'circular dependency issue warning'. In case we don't had this issue with the circular dependency, we could just
 * import KtdGridComponent on KtdGridItem and execute the needed function to get the rendering data.
 */
export type KtdGridItemRenderDataTokenType = (id: string) => KtdGridItemRenderData<string>;
export const GRID_ITEM_GET_RENDER_DATA_TOKEN: InjectionToken<KtdGridItemRenderDataTokenType> = new InjectionToken('GRID_ITEM_GET_RENDER_DATA_TOKEN');

export interface KtdDraggingData {
    pointerDownEvent: MouseEvent | TouchEvent;
    pointerDragEvent: MouseEvent | TouchEvent;
    gridElemClientRect: KtdClientRect;
    dragElemClientRect: KtdClientRect;
    scrollDifference: { top: number, left: number };
}
