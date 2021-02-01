import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { ktdNormalizePassiveListenerOptions } from './utils/passive-listeners';
import { fromEvent, iif, Observable, Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ktdIsMobileOrTablet } from './utils/pointer.utils';

/** Event options that can be used to bind an active, capturing event. */
const activeCapturingEventOptions = ktdNormalizePassiveListenerOptions({
    passive: false,
    capture: true
});

@Injectable({providedIn: 'root'})
export class KtdGridService implements OnDestroy {

    touchMove$: Observable<TouchEvent>;
    private touchMoveSubject: Subject<TouchEvent> = new Subject<TouchEvent>();
    private touchMoveSubscription: Subscription;

    constructor(private ngZone: NgZone) {
        this.touchMove$ = this.touchMoveSubject.asObservable();
        this.registerTouchMoveSubscription();
    }

    ngOnDestroy() {
        this.touchMoveSubscription.unsubscribe();
    }

    mouseOrTouchMove$(element): Observable<MouseEvent | TouchEvent> {
        return iif(
            () => ktdIsMobileOrTablet(),
            this.touchMove$,
            fromEvent<MouseEvent>(element, 'mousemove', activeCapturingEventOptions as AddEventListenerOptions) // TODO: Fix rxjs typings, boolean should be a good param too.
        );
    }

    private registerTouchMoveSubscription() {
        // The `touchmove` event gets bound once, ahead of time, because WebKit
        // won't preventDefault on a dynamically-added `touchmove` listener.
        // See https://bugs.webkit.org/show_bug.cgi?id=184250.
        this.touchMoveSubscription = this.ngZone.runOutsideAngular(() =>
            // The event handler has to be explicitly active,
            // because newer browsers make it passive by default.
            fromEvent(document, 'touchmove', activeCapturingEventOptions as AddEventListenerOptions) // TODO: Fix rxjs typings, boolean should be a good param too.
                .pipe(filter((touchEvent: TouchEvent) => touchEvent.touches.length === 1))
                .subscribe((touchEvent: TouchEvent) => this.touchMoveSubject.next(touchEvent))
        );
    }
}
