import { Directive, ElementRef, InjectionToken, } from '@angular/core';


/**
 * Injection token that can be used to reference instances of `KtdGridResizeHandle`. It serves as
 * alternative token to the actual `KtdGridResizeHandle` class which could cause unnecessary
 * retention of the class and its directive metadata.
 */
export const KTD_GRID_RESIZE_HANDLE = new InjectionToken<KtdGridResizeHandle>('KtdGridResizeHandle');

/** Handle that can be used to drag a KtdGridItem instance. */
@Directive({
    selector: '[ktdGridResizeHandle]',
    // eslint-disable-next-line @angular-eslint/no-host-metadata-property
    host: {
        class: 'ktd-grid-resize-handle'
    },
    providers: [{provide: KTD_GRID_RESIZE_HANDLE, useExisting: KtdGridResizeHandle}],
})
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export class KtdGridResizeHandle {

    constructor(
        public element: ElementRef<HTMLElement>) {
    }
}
