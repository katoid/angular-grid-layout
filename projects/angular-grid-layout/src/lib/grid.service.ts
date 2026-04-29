import { DestroyRef, DOCUMENT, Injectable, NgZone, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ktdNormalizePassiveListenerOptions } from './utils/passive-listeners';
import { fromEvent, iif, Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ktdIsMobileOrTablet, ktdSupportsPointerEvents } from './utils/pointer.utils';


/** Event options that can be used to bind an active, capturing event. */
const activeCapturingEventOptions = ktdNormalizePassiveListenerOptions({
    passive: false,
    capture: true
});

@Injectable({providedIn: 'root'})
export class KtdGridService {
    private readonly destroyRef = inject(DestroyRef);
    private readonly ngZone = inject(NgZone);
    private readonly document = inject(DOCUMENT);

    private touchMoveSubject: Subject<TouchEvent> = new Subject<TouchEvent>();
    touchMove$: Observable<TouchEvent> = this.touchMoveSubject.asObservable();

    constructor() {
        this.registerTouchMoveSubscription();
    }

    mouseOrTouchMove$(element): Observable<MouseEvent | TouchEvent> {
        if (!ktdSupportsPointerEvents()) {
            return iif(
                () => ktdIsMobileOrTablet(),
                this.touchMove$,
                fromEvent<MouseEvent>(element, 'mousemove', activeCapturingEventOptions as AddEventListenerOptions) // TODO: Fix rxjs typings, boolean should be a good param too.
            );
        }

        return fromEvent<MouseEvent>(element, 'pointermove', activeCapturingEventOptions as AddEventListenerOptions);
    }

    private registerTouchMoveSubscription() {
        // The `touchmove` event gets bound once, ahead of time, because WebKit
        // won't preventDefault on a dynamically-added `touchmove` listener.
        // See https://bugs.webkit.org/show_bug.cgi?id=184250.
        this.ngZone.runOutsideAngular(() =>
            // The event handler has to be explicitly active,
            // because newer browsers make it passive by default.
            fromEvent(this.document, 'touchmove', activeCapturingEventOptions as AddEventListenerOptions) // TODO: Fix rxjs typings, boolean should be a good param too.
                .pipe(
                    filter((touchEvent: TouchEvent) => touchEvent.touches.length === 1),
                    takeUntilDestroyed(this.destroyRef)
                )
                .subscribe((touchEvent: TouchEvent) => this.touchMoveSubject.next(touchEvent))
        );
    }
}
