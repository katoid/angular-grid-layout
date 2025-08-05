/**
 * IMPORTANT:
 * This utils are taken from the project: https://github.com/STRML/react-grid-layout.
 * The code should be as less modified as possible for easy maintenance.
 */

import { CompactType, getAllCollisions, Layout, LayoutItem, sortLayoutItems } from "./react-grid-layout.utils";

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
    preventCollision: boolean | null | undefined,
    compactType: CompactType,
    cols: number,
): Layout {
    const oldX = items[0].l.x;
    const oldY = items[0].l.y;
    items.forEach((item)=>{
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
        items = items.reverse()
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
                    cols
                );
            } else {
                layout = moveElementsAwayFromCollision(
                    layout,
                    item.l,
                    collision,
                    isUserAction,
                    compactType,
                    cols
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
    cols: number
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
    }

    return moveElements(
        layout,
        [{
            l: itemToMove,
            x: compactH ? collidesWith.x+1 : undefined,
            y: compactV ? collidesWith.y+1 : undefined,
        }],
        isUserAction,
        preventCollision,
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

