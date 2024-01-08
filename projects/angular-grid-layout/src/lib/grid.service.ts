import {Injectable, NgZone, OnDestroy} from '@angular/core';
import {KtdDraggingItem} from "./grid.definitions";
import { ktdNormalizePassiveListenerOptions } from './utils/passive-listeners';
import { fromEvent, iif, Observable, Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ktdIsMobileOrTablet, ktdSupportsPointerEvents, ktdPointerMove, ktdPointerUp } from './utils/pointer.utils';

/** Event options that can be used to bind an active, capturing event. */
const activeCapturingEventOptions = ktdNormalizePassiveListenerOptions({
    passive: false,
    capture: true
});

@Injectable({providedIn: 'root'})
export class KtdGridService {
    mouseTouchMove$: Observable<MouseEvent | TouchEvent>;
    private mouseTouchMoveSubject: Subject<MouseEvent | TouchEvent> = new Subject<MouseEvent | TouchEvent>();
    private mouseTouchMoveSubscription: Subscription;

    mouseTouchEnd$: Observable<MouseEvent | TouchEvent>;
    private mouseTouchEndSubject: Subject<MouseEvent | TouchEvent> = new Subject<MouseEvent | TouchEvent>();
    private mouseTouchEndSubscription: Subscription;

    draggingItem: KtdDraggingItem | null = null;

    constructor(private ngZone: NgZone) {
        this.mouseTouchMove$ = this.mouseTouchMoveSubject.asObservable();
        this.mouseTouchEnd$ = this.mouseTouchEndSubject.asObservable();
        this.initSubscriptions();
    }

    dispose() {
        this.mouseTouchMoveSubscription.unsubscribe();
        this.mouseTouchEndSubscription.unsubscribe();
    }

    private initSubscriptions() {
        this.mouseTouchMoveSubscription = this.ngZone.runOutsideAngular(() =>
            ktdPointerMove(document)
                .subscribe((mouseEvent: MouseEvent | TouchEvent) => this.mouseTouchMoveSubject.next(mouseEvent))
        );

        this.mouseTouchEndSubscription = this.ngZone.runOutsideAngular(() =>
            ktdPointerUp(document)
                .subscribe((mouseEvent: MouseEvent | TouchEvent) => this.mouseTouchEndSubject.next(mouseEvent))
        );
    }
}
