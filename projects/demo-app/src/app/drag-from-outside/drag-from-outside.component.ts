import { Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { fromEvent, merge, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { KtdGridModule, KtdGridComponent, KtdGridLayout, ktdTrackById, KtdGridBackgroundCfg, KtdGridCompactType } from '@katoid/angular-grid-layout';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterModule } from '@angular/router';
import { KtdFooterComponent } from '../components/footer/footer.component';
import { pokemonsGen1 } from './pokemons-gen1';
import {compact} from "../../../../angular-grid-layout/src/lib/utils/react-grid-layout.utils";
import {KtdDropped} from "../../../../angular-grid-layout/src/lib/grid.component";


interface Pokemon {
    name: string,
    url: string,
    img: string
}
@Component({
    selector: 'ktd-drag-from-outside',
    standalone: true,
    imports: [CommonModule, KtdGridModule, RouterModule, KtdFooterComponent],
    templateUrl: './drag-from-outside.component.html',
    styleUrls: ['./drag-from-outside.component.scss']
})
export class KtdDragFromOutsideComponent implements OnInit, OnDestroy {
    @ViewChild(KtdGridComponent, {static: true}) grid: KtdGridComponent;
    trackById = ktdTrackById;
    layout: KtdGridLayout = [];
    layout2: KtdGridLayout = [];
    compactType: KtdGridCompactType = null;
    backgroundConfig: KtdGridBackgroundCfg = {show: 'always'};

    pokemonsGen1Dict: Pokemon[] = pokemonsGen1.map((pokemon, index) => ({
        ...pokemon,
        img: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${index + 1}.png`
    }));

    private resizeSubscription: Subscription;

    constructor(@Inject(DOCUMENT) public document: Document) { }

    ngOnInit() {
        this.resizeSubscription = merge(
            fromEvent(window, 'resize'),
            fromEvent(window, 'orientationchange')
        ).pipe(
            debounceTime(50)
        ).subscribe(() => {
            this.grid.resize();
        });
    }

    ngOnDestroy() {
        this.resizeSubscription.unsubscribe();
    }

    onLayoutUpdated(layout: KtdGridLayout) {
        console.log('onLayoutUpdated', layout);
        this.layout = layout;
    }

    onLayoutDropped(event: KtdDropped<Pokemon>) {
        console.log('onLayoutDropped', event);
        this.layout = [event.currentLayoutItem, ...event.currentLayout];
        this.layout = compact(this.layout, this.compactType, this.grid.cols);
    }

    onLayout2Updated(layout: KtdGridLayout) {
        console.log('onLayout2Updated', layout);
        this.layout2 = layout;
    }

    onLayout2Dropped(event: KtdDropped<Pokemon>) {
        console.log('onLayoutDropped', event);
        this.layout2 = [event.currentLayoutItem, ...event.currentLayout];
        this.layout2 = compact(this.layout2, this.compactType, this.grid.cols);
    }
}
