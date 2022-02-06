import { animationFrameScheduler, fromEvent, interval, NEVER, Observable } from 'rxjs';
import { distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';
import { ktdNormalizePassiveListenerOptions } from './passive-listeners';
import { getMutableClientRect, KtdClientRect } from './client-rect';
import { ktdNoEmit } from './operators';

/**
 * Proximity, as a ratio to width/height at which to start auto-scrolling.
 * The value comes from trying it out manually until it feels right.
 */
const SCROLL_PROXIMITY_THRESHOLD = 0.05;

/** Vertical direction in which we can auto-scroll. */
const enum AutoScrollVerticalDirection {NONE, UP, DOWN}

/** Horizontal direction in which we can auto-scroll. */
const enum AutoScrollHorizontalDirection {NONE, LEFT, RIGHT}

export interface KtdScrollPosition {
    top: number;
    left: number;
}


/**
 * Increments the vertical scroll position of a node.
 * @param node Node whose scroll position should change.
 * @param amount Amount of pixels that the `node` should be scrolled.
 */
function incrementVerticalScroll(node: HTMLElement | Window, amount: number) {
    if (node === window) {
        (node as Window).scrollBy(0, amount);
    } else {
        // Ideally we could use `Element.scrollBy` here as well, but IE and Edge don't support it.
        (node as HTMLElement).scrollTop += amount;
    }
}

/**
 * Increments the horizontal scroll position of a node.
 * @param node Node whose scroll position should change.
 * @param amount Amount of pixels that the `node` should be scrolled.
 */
function incrementHorizontalScroll(node: HTMLElement | Window, amount: number) {
    if (node === window) {
        (node as Window).scrollBy(amount, 0);
    } else {
        // Ideally we could use `Element.scrollBy` here as well, but IE and Edge don't support it.
        (node as HTMLElement).scrollLeft += amount;
    }
}


/**
 * Gets whether the vertical auto-scroll direction of a node.
 * @param clientRect Dimensions of the node.
 * @param pointerY Position of the user's pointer along the y axis.
 */
function getVerticalScrollDirection(clientRect: KtdClientRect, pointerY: number) {
    const {top, bottom, height} = clientRect;
    const yThreshold = height * SCROLL_PROXIMITY_THRESHOLD;

    if (pointerY >= top - yThreshold && pointerY <= top + yThreshold) {
        return AutoScrollVerticalDirection.UP;
    } else if (pointerY >= bottom - yThreshold && pointerY <= bottom + yThreshold) {
        return AutoScrollVerticalDirection.DOWN;
    }

    return AutoScrollVerticalDirection.NONE;
}

/**
 * Gets whether the horizontal auto-scroll direction of a node.
 * @param clientRect Dimensions of the node.
 * @param pointerX Position of the user's pointer along the x axis.
 */
function getHorizontalScrollDirection(clientRect: KtdClientRect, pointerX: number) {
    const {left, right, width} = clientRect;
    const xThreshold = width * SCROLL_PROXIMITY_THRESHOLD;

    if (pointerX >= left - xThreshold && pointerX <= left + xThreshold) {
        return AutoScrollHorizontalDirection.LEFT;
    } else if (pointerX >= right - xThreshold && pointerX <= right + xThreshold) {
        return AutoScrollHorizontalDirection.RIGHT;
    }

    return AutoScrollHorizontalDirection.NONE;
}

/**
 * Returns an observable that schedules a loop and apply scroll on the scrollNode into the specified direction/s.
 * This observable doesn't emit, it just performs the 'scroll' side effect.
 * @param scrollNode, node where the scroll would be applied.
 * @param verticalScrollDirection, vertical direction of the scroll.
 * @param horizontalScrollDirection, horizontal direction of the scroll.
 * @param scrollStep, scroll step in CSS pixels that would be applied in every loop.
 */
function scrollToDirectionInterval$(scrollNode: HTMLElement | Window, verticalScrollDirection: AutoScrollVerticalDirection, horizontalScrollDirection: AutoScrollHorizontalDirection, scrollStep: number = 2) {
    return interval(0, animationFrameScheduler)
        .pipe(
            tap(() => {
                if (verticalScrollDirection === AutoScrollVerticalDirection.UP) {
                    incrementVerticalScroll(scrollNode, -scrollStep);
                } else if (verticalScrollDirection === AutoScrollVerticalDirection.DOWN) {
                    incrementVerticalScroll(scrollNode, scrollStep);
                }

                if (horizontalScrollDirection === AutoScrollHorizontalDirection.LEFT) {
                    incrementHorizontalScroll(scrollNode, -scrollStep);
                } else if (horizontalScrollDirection === AutoScrollHorizontalDirection.RIGHT) {
                    incrementHorizontalScroll(scrollNode, scrollStep);
                }
            }),
            ktdNoEmit()
        );
}

export interface KtdScrollIfNearElementOptions {
    scrollStep?: number;
    disableVertical?: boolean;
    disableHorizontal?: boolean;
}

/**
 * Given a source$ observable with pointer location, scroll the scrollNode if the pointer is near to it.
 * This observable doesn't emit, it just performs a 'scroll' side effect.
 * @param scrollableParent, parent node in which the scroll would be performed.
 * @param options, configuration options.
 */
export function ktdScrollIfNearElementClientRect$(scrollableParent: HTMLElement | Document, options?: KtdScrollIfNearElementOptions): (source$: Observable<{ pointerX: number, pointerY: number }>) => Observable<any> {

    let scrollNode: Window | HTMLElement;
    let scrollableParentClientRect: KtdClientRect;
    let scrollableParentScrollWidth: number;

    if (scrollableParent === document) {
        scrollNode = document.defaultView as Window;
        const {width, height} = getViewportSize();
        scrollableParentClientRect = {width, height, top: 0, right: width, bottom: height, left: 0};
        scrollableParentScrollWidth = getDocumentScrollWidth();
    } else {
        scrollNode = scrollableParent as HTMLElement;
        scrollableParentClientRect = getMutableClientRect(scrollableParent as HTMLElement);
        scrollableParentScrollWidth = (scrollableParent as HTMLElement).scrollWidth;
    }

    /**
     * IMPORTANT: By design, only let scroll horizontal if the scrollable parent has explicitly an scroll horizontal.
     * This layout solution is not designed in mind to have any scroll horizontal, but exceptionally we allow it in this
     * specific use case.
     */
    options = options || {};
    if (options.disableHorizontal == null && scrollableParentScrollWidth <= scrollableParentClientRect.width) {
        options.disableHorizontal = true;
    }

    return (source$) => source$.pipe(
        map(({pointerX, pointerY}) => {
            let verticalScrollDirection = getVerticalScrollDirection(scrollableParentClientRect, pointerY);
            let horizontalScrollDirection = getHorizontalScrollDirection(scrollableParentClientRect, pointerX);

            // Check if scroll directions are disabled.
            if (options?.disableVertical) {
                verticalScrollDirection = AutoScrollVerticalDirection.NONE;
            }
            if (options?.disableHorizontal) {
                horizontalScrollDirection = AutoScrollHorizontalDirection.NONE;
            }

            return {verticalScrollDirection, horizontalScrollDirection};
        }),
        distinctUntilChanged((prev, actual) => {
            return prev.verticalScrollDirection === actual.verticalScrollDirection
                && prev.horizontalScrollDirection === actual.horizontalScrollDirection;
        }),
        switchMap(({verticalScrollDirection, horizontalScrollDirection}) => {
            if (verticalScrollDirection || horizontalScrollDirection) {
                return scrollToDirectionInterval$(scrollNode, verticalScrollDirection, horizontalScrollDirection, options?.scrollStep);
            } else {
                return NEVER;
            }
        })
    );
}

/**
 * Emits on EVERY scroll event and returns the accumulated scroll offset relative to the initial scroll position.
 * @param scrollableParent, node in which scroll events would be listened.
 */
export function ktdGetScrollTotalRelativeDifference$(scrollableParent: HTMLElement | Document): Observable<{ top: number, left: number }> {
    let scrollInitialPosition;

    // Calculate initial scroll position
    if (scrollableParent === document) {
        scrollInitialPosition = getViewportScrollPosition();
    } else {
        scrollInitialPosition = {
            top: (scrollableParent as HTMLElement).scrollTop,
            left: (scrollableParent as HTMLElement).scrollLeft
        };
    }

    return fromEvent(scrollableParent, 'scroll', ktdNormalizePassiveListenerOptions({capture: true}) as AddEventListenerOptions).pipe(
        map(() => {
            let newTop: number;
            let newLeft: number;

            if (scrollableParent === document) {
                const viewportScrollPosition = getViewportScrollPosition();
                newTop = viewportScrollPosition.top;
                newLeft = viewportScrollPosition.left;
            } else {
                newTop = (scrollableParent as HTMLElement).scrollTop;
                newLeft = (scrollableParent as HTMLElement).scrollLeft;
            }

            const topDifference = scrollInitialPosition.top - newTop;
            const leftDifference = scrollInitialPosition.left - newLeft;

            return {top: topDifference, left: leftDifference};
        })
    );

}

/** Returns the viewport's width and height. */
function getViewportSize(): { width: number, height: number } {
    const _window = document.defaultView || window;
    return {
        width: _window.innerWidth,
        height: _window.innerHeight
    };

}

/** Gets a ClientRect for the viewport's bounds. */
function getViewportRect(): KtdClientRect {
    // Use the document element's bounding rect rather than the window scroll properties
    // (e.g. pageYOffset, scrollY) due to in issue in Chrome and IE where window scroll
    // properties and client coordinates (boundingClientRect, clientX/Y, etc.) are in different
    // conceptual viewports. Under most circumstances these viewports are equivalent, but they
    // can disagree when the page is pinch-zoomed (on devices that support touch).
    // See https://bugs.chromium.org/p/chromium/issues/detail?id=489206#c4
    // We use the documentElement instead of the body because, by default (without a css reset)
    // browsers typically give the document body an 8px margin, which is not included in
    // getBoundingClientRect().
    const scrollPosition = getViewportScrollPosition();
    const {width, height} = getViewportSize();

    return {
        top: scrollPosition.top,
        left: scrollPosition.left,
        bottom: scrollPosition.top + height,
        right: scrollPosition.left + width,
        height,
        width,
    };
}

/** Gets the (top, left) scroll position of the viewport. */
function getViewportScrollPosition(): { top: number, left: number } {

    // The top-left-corner of the viewport is determined by the scroll position of the document
    // body, normally just (scrollLeft, scrollTop). However, Chrome and Firefox disagree about
    // whether `document.body` or `document.documentElement` is the scrolled element, so reading
    // `scrollTop` and `scrollLeft` is inconsistent. However, using the bounding rect of
    // `document.documentElement` works consistently, where the `top` and `left` values will
    // equal negative the scroll position.
    const windowRef = document.defaultView || window;
    const documentElement = document.documentElement!;
    const documentRect = documentElement.getBoundingClientRect();

    const top = -documentRect.top || document.body.scrollTop || windowRef.scrollY ||
        documentElement.scrollTop || 0;

    const left = -documentRect.left || document.body.scrollLeft || windowRef.scrollX ||
        documentElement.scrollLeft || 0;

    return {top, left};
}

/** Returns the document scroll width */
function getDocumentScrollWidth() {
    return Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
}

