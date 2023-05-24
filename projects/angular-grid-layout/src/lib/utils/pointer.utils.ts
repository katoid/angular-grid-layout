import { fromEvent, iif, merge, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ktdNormalizePassiveListenerOptions } from './passive-listeners';

/** Options that can be used to bind a passive event listener. */
const passiveEventListenerOptions = ktdNormalizePassiveListenerOptions({passive: true});

/** Options that can be used to bind an active event listener. */
const activeEventListenerOptions = ktdNormalizePassiveListenerOptions({passive: false});

let isMobile: boolean | null = null;

export function ktdIsMobileOrTablet(): boolean {

    if (isMobile != null) {
        return isMobile;
    }

    // Generic match pattern to identify mobile or tablet devices
    const isMobileDevice = /Android|webOS|BlackBerry|Windows Phone|iPad|iPhone|iPod/i.test(navigator.userAgent);

    // Since IOS 13 is not safe to just check for the generic solution. See: https://stackoverflow.com/questions/58019463/how-to-detect-device-name-in-safari-on-ios-13-while-it-doesnt-show-the-correct
    const isIOSMobileDevice = /iPad|iPhone|iPod/.test(navigator.platform) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    isMobile = isMobileDevice || isIOSMobileDevice;

    return isMobile;
}

export function ktdIsMouseEvent(event: any): event is MouseEvent {
    return (event as MouseEvent).clientX != null;
}

export function ktdIsTouchEvent(event: any): event is TouchEvent {
    return (event as TouchEvent).touches != null && (event as TouchEvent).touches.length != null;
}

export function ktdPointerClientX(event: MouseEvent | TouchEvent): number {
    return ktdIsMouseEvent(event) ? event.clientX : event.touches[0].clientX;
}

export function ktdPointerClientY(event: MouseEvent | TouchEvent): number {
    return ktdIsMouseEvent(event) ? event.clientY : event.touches[0].clientY;
}

export function ktdPointerClient(event: MouseEvent | TouchEvent): { clientX: number, clientY: number } {
    return {
        clientX: ktdIsMouseEvent(event) ? event.clientX : event.touches[0].clientX,
        clientY: ktdIsMouseEvent(event) ? event.clientY : event.touches[0].clientY
    };
}

/** Returns true if browser supports pointer events */
export function ktdSupportsPointerEvents(): boolean {
    return !!window.PointerEvent;
}

/**
 * Emits when a mousedown or touchstart emits. Avoids conflicts between both events.
 * @param element, html element where to  listen the events.
 * @param touchNumber number of the touch to track the event, default to the first one.
 */
function ktdMouseOrTouchDown(element, touchNumber = 1): Observable<MouseEvent | TouchEvent> {
    return iif(
        () => ktdIsMobileOrTablet(),
        fromEvent<TouchEvent>(element, 'touchstart', passiveEventListenerOptions as AddEventListenerOptions).pipe(
            filter((touchEvent) => touchEvent.touches.length === touchNumber)
        ),
        fromEvent<MouseEvent>(element, 'mousedown', activeEventListenerOptions as AddEventListenerOptions).pipe(
            filter((mouseEvent: MouseEvent) => {
                /**
                 * 0 : Left mouse button
                 * 1 : Wheel button or middle button (if present)
                 * 2 : Right mouse button
                 */
                return mouseEvent.button === 0; // Mouse down to be only fired if is left click
            })
        )
    );
}

/**
 * Emits when a 'mousemove' or a 'touchmove' event gets fired.
 * @param element, html element where to  listen the events.
 * @param touchNumber number of the touch to track the event, default to the first one.
 */
function ktdMouserOrTouchMove(element: HTMLElement, touchNumber = 1): Observable<MouseEvent | TouchEvent> {
    return iif(
        () => ktdIsMobileOrTablet(),
        fromEvent<TouchEvent>(element, 'touchmove', activeEventListenerOptions as AddEventListenerOptions).pipe(
            filter((touchEvent) => touchEvent.touches.length === touchNumber),
        ),
        fromEvent<MouseEvent>(element, 'mousemove', activeEventListenerOptions as AddEventListenerOptions)
    );
}

export function ktdTouchEnd(element, touchNumber = 1): Observable<TouchEvent> {
    return merge(
        fromEvent<TouchEvent>(element, 'touchend').pipe(
            filter((touchEvent) => touchEvent.touches.length === touchNumber - 1)
        ),
        fromEvent<TouchEvent>(element, 'touchcancel').pipe(
            filter((touchEvent) => touchEvent.touches.length === touchNumber - 1)
        )
    );
}

/**
 * Emits when a there is a 'mouseup' or the touch ends.
 * @param element, html element where to  listen the events.
 * @param touchNumber number of the touch to track the event, default to the first one.
 */
function ktdMouserOrTouchEnd(element: HTMLElement, touchNumber = 1): Observable<MouseEvent | TouchEvent> {
    return iif(
        () => ktdIsMobileOrTablet(),
        ktdTouchEnd(element, touchNumber),
        fromEvent<MouseEvent>(element, 'mouseup'),
    );
}


/**
 * Emits when a 'pointerdown' event occurs (only for the primary pointer). Fallbacks to 'mousemove' or a 'touchmove' if pointer events are not supported.
 * @param element, html element where to listen the events.
 */
export function ktdPointerDown(element): Observable<MouseEvent | TouchEvent | PointerEvent> {
    if (!ktdSupportsPointerEvents()) {
        return ktdMouseOrTouchDown(element);
    }

    return fromEvent<PointerEvent>(element, 'pointerdown', passiveEventListenerOptions as AddEventListenerOptions).pipe(
        filter((pointerEvent) => pointerEvent.isPrimary)
    )
}

/**
 * Emits when a 'pointermove' event occurs (only for the primary pointer). Fallbacks to 'mousemove' or a 'touchmove' if pointer events are not supported.
 * @param element, html element where to listen the events.
 */
export function ktdPointerMove(element): Observable<MouseEvent | TouchEvent | PointerEvent> {
    if (!ktdSupportsPointerEvents()) {
        return ktdMouserOrTouchMove(element);
    }
    return fromEvent<PointerEvent>(element, 'pointermove', activeEventListenerOptions as AddEventListenerOptions).pipe(
        filter((pointerEvent) => pointerEvent.isPrimary),
    );
}

/**
 * Emits when a 'pointerup' event occurs (only for the primary pointer). Fallbacks to 'mousemove' or a 'touchmove' if pointer events are not supported.
 * @param element, html element where to listen the events.
 */
export function ktdPointerUp(element): Observable<MouseEvent | TouchEvent | PointerEvent> {
    if (!ktdSupportsPointerEvents()) {
        return ktdMouserOrTouchEnd(element);
    }
    return fromEvent<PointerEvent>(element, 'pointerup').pipe(filter(pointerEvent => pointerEvent.isPrimary));
}
