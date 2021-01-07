import {
    ChangeDetectionStrategy, Component, ElementRef, EventEmitter, forwardRef, Inject, Input, OnInit, Output, Renderer2, ViewChild
} from '@angular/core';
import { BehaviorSubject, NEVER, Observable } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { ktdMouseOrTouchDown } from '../pointer.utils';
import { GRID_ITEM_GET_RENDER_DATA_TOKEN, KtdGridItemRenderDataTokenType } from '../grid.definitions';

@Component({
    selector: 'ktd-grid-item',
    templateUrl: './grid-item.component.html',
    styleUrls: ['./grid-item.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KtdGridItemComponent implements OnInit {
    @ViewChild('resizeElem', {static: true, read: ElementRef}) resizeElem: ElementRef;
    @Output() removeClicked: EventEmitter<{ id: string }> = new EventEmitter<{ id: string }>();

    @Input() transition: string = 'transform 500ms ease, width 500ms linear, height 500ms linear';

    @Input()
    get id(): string {
        return this._id;
    }

    set id(val: string) {
        this._id = val;
    }

    @Input()
    get draggable(): boolean {
        return this._draggable;
    }

    set draggable(val: boolean) {
        this._draggable = val;
        this._draggable$.next(val);
    }

    private _draggable: boolean;
    private _draggable$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    @Input()
    get resizable(): boolean {
        return this._resizable;
    }

    set resizable(val: boolean) {
        this._resizable = val;
    }

    private _resizable: boolean;

    @Input()
    get removable(): boolean {
        return this._removable;
    }

    set removable(val: boolean) {
        this._removable = val;
    }

    private _removable: boolean;

    private _id: string;

    constructor(public elementRef: ElementRef, private renderer: Renderer2, @Inject(GRID_ITEM_GET_RENDER_DATA_TOKEN) private getItemRenderData: KtdGridItemRenderDataTokenType) {

    }

    ngOnInit() {
        const gridItemRenderData = this.getItemRenderData(this.id)!;
        this.setStyles(gridItemRenderData);
    }

    removeIconClicked(event) {
        event.stopImmediatePropagation();
        this.removeClicked.emit({id: this.id});
    }

    setStyles({top, left, width, height}: { top: string, left: string, width?: string, height?: string }) {
        // transform is 6x times faster than top/left
        this.renderer.setStyle(this.elementRef.nativeElement, 'transform', `translateX(${left}) translateY(${top})`);
        this.renderer.setStyle(this.elementRef.nativeElement, 'display', `block`);
        this.renderer.setStyle(this.elementRef.nativeElement, 'transition', this.transition);
        if (width != null) { this.renderer.setStyle(this.elementRef.nativeElement, 'width', width); }
        if (height != null) {this.renderer.setStyle(this.elementRef.nativeElement, 'height', height); }
    }

    dragStart$(): Observable<MouseEvent | TouchEvent> {
        return this._draggable$.pipe(
            switchMap((draggable) =>
                !draggable ? NEVER : ktdMouseOrTouchDown(this.elementRef.nativeElement, 1, false)
                    .pipe(filter((event) => {
                        return !(event.target as Element).classList.contains('grid-item-remove-icon')
                            && !(event.target as Element).classList.contains('grid-custom-input');
                    }))
            )
        );
    }

    resizeStart$(): Observable<MouseEvent | TouchEvent> {
        // We don't need any change of stream for cancel it when non resizable. resizeElem if not resizable would be not displayed and in consequence would never emit
        return ktdMouseOrTouchDown(this.resizeElem.nativeElement, 1, false);
    }

}
