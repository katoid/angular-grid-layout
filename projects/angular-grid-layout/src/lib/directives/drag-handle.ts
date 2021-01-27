import { Directive, ElementRef, InjectionToken } from '@angular/core';

/**
 * Injection token that can be used to reference instances of `KtdGridDragHandle`. It serves as
 * alternative token to the actual `KtdGridDragHandle` class which could cause unnecessary
 * retention of the class and its directive metadata.
 */
export const KTD_GRID_DRAG_HANDLE = new InjectionToken<KtdGridDragHandle>('KtdGridDragHandle');

/** Handle that can be used to drag a KtdGridItem instance. */
@Directive({
    selector: '[ktdGridDragHandle]',
    // tslint:disable-next-line:no-host-metadata-property
    host: {
        // tslint:disable-next-line
        'class': 'ktd-grid-drag-handle'
    },
    providers: [{provide: KTD_GRID_DRAG_HANDLE, useExisting: KtdGridDragHandle}],
})
// tslint:disable-next-line:directive-class-suffix
export class KtdGridDragHandle {
    constructor(
        public element: ElementRef<HTMLElement>) {
    }
}
