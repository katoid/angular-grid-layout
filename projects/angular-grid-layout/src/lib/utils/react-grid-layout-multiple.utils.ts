/**
 * IMPORTANT:
 * This utils are taken from the project: https://github.com/STRML/react-grid-layout.
 * The code should be as less modified as possible for easy maintenance.
 */

import { CompactType, getAllCollisions, getFirstCollision, Layout, LayoutItem, sortLayoutItems } from './react-grid-layout.utils';

const DEBUG = false;


/**
 * Move a set of elements "items". Responsible for doing cascading movements of other elements.
 *
 * @export
 * @param {Layout} layout
 * @param {({
 *         l: LayoutItem,
 *         x: number | null | undefined,
 *         y: number | null | undefined
 *     }[])} items
 * @param {(boolean | null | undefined)} isUserAction
 * @param {(boolean | null | undefined)} preventCollision
 * @param {CompactType} compactType
 * @param {number} cols
 * @returns {Layout}
 */
export function KtdMoveMultipleElements(
    layout: Layout,
    items: {
        l: LayoutItem,
        x: number | null | undefined,
        y: number | null | undefined
    }[],
    isUserAction: boolean | null | undefined,
    compactType: CompactType,
    cols: number
): Layout {
    let axes = compactType === 'vertical' ? 'y' : 'x';
    // Short-circuit if nothing to do.
    if (items.every((item) => item.l.y === item.y && item.l.x === item.x)) {
        return layout;
    }
    // Old coordinates to detect the cursor movement direction (up, down, left, right)
    const oldX = items[0].l.x;
    const oldY = items[0].l.y;
    // Old coordinates before mutation, to retrieve it if the element cant move
    const oldCoord = {}

    // Move the selected elements
    items.forEach((item) => {
        oldCoord[item.l.id] = {
            x: item.l.x,
            y: item.l.y
        }
        if (typeof item.x === 'number') {
            item.l.x = item.x;
        }
        if (typeof item.y === 'number') {
            item.l.y = item.y;
        }
        item.l.moved = true;
    })

    let sorted = sortLayoutItems(layout, compactType);
    let itemsSorted = sortLayoutItems(items.map(item => item.l), compactType);

    // If this collides with anything, move it.
    // When doing this comparison, we have to sort the items we compare with
    // to ensure, in the case of multiple collisions, that we're getting the
    // nearest collision.
    const movingUp =
        compactType === 'vertical' && typeof items[0].y === 'number'
            ? oldY >= items[0].y
            : compactType === 'horizontal' && typeof items[0].x === 'number'
                ? oldX >= items[0].x
                : false;
    if (movingUp) {
        sorted = sorted.reverse();
    }

    // Get the position of the first row/col of the moved block, to avoid repositioning elements between the moved block, only
    // can apply a repositioning if the collide item its on the first row/col
    let minAxe: number | undefined;
    if (itemsSorted && itemsSorted.length) {
        minAxe = itemsSorted[0][axes];
    }
    // For each element, detect collisions and move the collided element by +1
    itemsSorted.forEach((item) => {
        const collisions: LayoutItem[] = getAllCollisions(sorted, item);
        // Move each item that collides away from this element.
        for (let i = 0, len = collisions.length; i < len; i++) {
            const collision = collisions[i];
            logMulti(
                `Resolving collision between ${item.id}] and ${
                    collision.id
                } at [${collision.x},${collision.y}]`,
            );
            // Short circuit so we can't infinite loop
            if (collision.moved) {
                continue;
            }
            // Don't move static items - we have to move *this* element away
            if (collision.static && !item.static) {
                layout = KtdMoveElementsAwayFromCollision(
                    layout,
                    collision,
                    item,
                    minAxe === item[axes] ? isUserAction : false, // We only allow repositioning the "item" element if "collision" is in the first row of the moved block
                    compactType,
                    cols
                );
            } else {
                layout = KtdMoveElementsAwayFromCollision(
                    layout,
                    item,
                    collision,
                    minAxe === item[axes] ? isUserAction : false, // We only allow repositioning the "collision" element if "item" is in the first row of the moved block
                    compactType,
                    cols
                );
            }
        }
    });

    return layout;
}

/**
 * Move the element "itemToMove" away from the collision with "collidesWith"
 * @export
 * @param {Layout} layout
 * @param {LayoutItem} collidesWith
 * @param {LayoutItem} itemToMove
 * @param {(boolean | null | undefined)} isUserAction
 * @param {CompactType} compactType
 * @param {number} cols
 * @returns {Layout}
 */
export function KtdMoveElementsAwayFromCollision(
    layout: Layout,
    collidesWith: LayoutItem,
    itemToMove: LayoutItem,
    isUserAction: boolean | null | undefined,
    compactType: CompactType,
    cols: number,
): Layout {
    const compactH = compactType === 'horizontal';
    // Compact vertically if not set to horizontal
    const compactV = compactType !== 'horizontal';

    // If there is enough space above the collision to put this element, move it there.
    // We only do this on the main collision as this can get funky in cascades and cause
    // unwanted swapping behavior.
    if (isUserAction) {
        // Reset isUserAction flag because we're not in the main collision anymore.
        isUserAction = false;

        // Make a mock item so we don't modify the item here, only modify in moveElement.
        const fakeItem: LayoutItem = {
            x: compactH
                ? Math.max(collidesWith.x - itemToMove.w, 0)
                : itemToMove.x,
            y: compactV
                ? Math.max(collidesWith.y - itemToMove.h, 0)
                : itemToMove.y,
            w: itemToMove.w,
            h: itemToMove.h,
            id: '-1',
        };

        // No collision? If so, we can go up there; otherwise, we'll end up moving down as normal
        if (!getFirstCollision(layout, fakeItem)) {
            logMulti(
                `Doing reverse collision on ${itemToMove.id} up to [${
                    fakeItem.x
                },${fakeItem.y}].`,
            );
            return KtdMoveMultipleElements(
                layout,
                [{
                    l: itemToMove,
                    x: compactH ? fakeItem.x : undefined,
                    y: compactV ? fakeItem.y : undefined,
                }],
                isUserAction,
                compactType,
                cols
            );
        }
    }

    return KtdMoveMultipleElements(
        layout,
        [{
            l: itemToMove,
            x: compactH ? itemToMove.x + 1 : undefined,
            y: compactV ? itemToMove.y + 1 : undefined,
        }],
        isUserAction,
        compactType,
        cols
    );
}

function logMulti(...args) {
    if (!DEBUG) {
        return;
    }
    // eslint-disable-next-line no-console
    console.log(...args);
}

