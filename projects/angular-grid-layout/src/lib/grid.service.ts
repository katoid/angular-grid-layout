import {Injectable, NgZone} from '@angular/core';
import {Observable, Subject, Subscription} from 'rxjs';
import {ktdMouseOrTouchEnd, ktdMouseOrTouchMove} from './utils/pointer.utils';
import {KtdDraggingItem} from "./grid.definitions";


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
            ktdMouseOrTouchMove(document, 1)
                .subscribe((mouseEvent: MouseEvent | TouchEvent) => this.mouseTouchMoveSubject.next(mouseEvent))
        );

        this.mouseTouchEndSubscription = this.ngZone.runOutsideAngular(() =>
            ktdMouseOrTouchEnd(document, 1)
                .subscribe((mouseEvent: MouseEvent | TouchEvent) => this.mouseTouchEndSubject.next(mouseEvent))
        );
    }
}
