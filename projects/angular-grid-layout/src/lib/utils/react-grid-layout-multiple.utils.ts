/**
 * IMPORTANT:
 * This utils are taken from the project: https://github.com/STRML/react-grid-layout.
 * The code should be as less modified as possible for easy maintenance.
 */

import { CompactType, getAllCollisions, getFirstCollision, Layout, LayoutItem, sortLayoutItems } from "./react-grid-layout.utils";

const DEBUG = false;

// Disable lint since we don't want to modify this code
/* eslint-disable */

/**
 * Move an element. Responsible for doing cascading movements of other elements.
 *
 * @param  {Array}      layout            Full layout to modify.
 * @param  {LayoutItem} l                 element to move.
 * @param  {Number}     [x]               X position in grid units.
 * @param  {Number}     [y]               Y position in grid units.
 */
export function moveElements(
    layout: Layout,
    items: {
        l: LayoutItem,
        x: number | null | undefined,
        y: number | null | undefined
    }[],
    isUserAction: boolean | null | undefined,
    compactType: CompactType,
    cols: number,
    movingUpUser?:boolean
): Layout {
    const oldX = items[0].l.x;
    const oldY = items[0].l.y;
    const oldCoord = {}

    items.forEach
    items.forEach((item)=>{
        oldCoord[item.l.id]={
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
    if(isUserAction){
        movingUpUser = movingUp;
    }

    items.forEach((item)=>{
        const collisions: LayoutItem[] = getAllCollisions(sorted, item.l);
        // Move each item that collides away from this element.
        for (let i = 0, len = collisions.length; i < len; i++) {
            const collision = collisions[i];
            logMulti(
                `Resolving collision between ${items}] and ${
                    collision.id
                } at [${collision.x},${collision.y}]`,
            );
            // Short circuit so we can't infinite loop
            if (collision.moved) {
                continue;
            }
            // Don't move static items - we have to move *this* element away
            if (collision.static) {
                layout = moveElementsAwayFromCollision(
                    layout,
                    collision,
                    item.l,
                    isUserAction,
                    compactType,
                    cols,
                    movingUpUser
                );
            } else {
                layout = moveElementsAwayFromCollision(
                    layout,
                    item.l,
                    collision,
                    isUserAction,
                    compactType,
                    cols,
                    movingUpUser
                );
            }
        }
    });

    return layout;
}

export function moveElementsAwayFromCollision(
    layout: Layout,
    collidesWith: LayoutItem,
    itemToMove: LayoutItem,
    isUserAction: boolean | null | undefined,
    compactType: CompactType,
    cols: number,
    movingUp: boolean | undefined
): Layout {
    const compactH = compactType === 'horizontal';
    // Compact vertically if not set to horizontal
    const compactV = compactType !== 'horizontal';
    const preventCollision = collidesWith.static; // we're already colliding (not for static items)

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
            return moveElements(
                layout,
                [{
                    l: itemToMove,
                    x: compactH ? fakeItem.x : undefined,
                    y: compactV ? fakeItem.y : undefined,
                }],
                isUserAction,
                compactType,
                cols,
                movingUp
            );
        }
    }

    return moveElements(
        layout,
        [{
            l: itemToMove,
            x: compactH ? itemToMove.x+1 : undefined,
            y: compactV ? itemToMove.y+1 : undefined,
        }],
        isUserAction,
        compactType,
        cols,
        movingUp
    );
}

function logMulti(...args) {
    if (!DEBUG) {
        return;
    }
    // eslint-disable-next-line no-console
    console.log(...args);
}

