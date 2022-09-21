import { Directive, InjectionToken, Input, TemplateRef } from '@angular/core';

/**
 * Injection token that can be used to reference instances of `KtdGridItemPlaceholder`. It serves as
 * alternative token to the actual `KtdGridItemPlaceholder` class which could cause unnecessary
 * retention of the class and its directive metadata.
 */
export const KTD_GRID_ITEM_PLACEHOLDER = new InjectionToken<KtdGridItemPlaceholder>('KtdGridItemPlaceholder');

/** Directive that can be used to create a custom placeholder for a KtdGridItem instance. */
@Directive({
    selector: 'ng-template[ktdGridItemPlaceholder]',
    // eslint-disable-next-line @angular-eslint/no-host-metadata-property
    host: {
        class: 'ktd-grid-item-placeholder-content'
    },
    providers: [{provide: KTD_GRID_ITEM_PLACEHOLDER, useExisting: KtdGridItemPlaceholder}],
})
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export class KtdGridItemPlaceholder<T = any> {
    /** Context data to be added to the placeholder template instance. */
    @Input() data: T;
    constructor(public templateRef: TemplateRef<T>) {}
}
