import { Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { fromEvent, merge, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { KtdGridModule, KtdGridComponent, KtdGridLayout, ktdTrackById, KtdGridBackgroundCfg, KtdGridCompactType } from '@katoid/angular-grid-layout';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterModule } from '@angular/router';
import { KtdFooterComponent } from '../components/footer/footer.component';
import { pokemonsGen1 } from './pokemons-gen1';
import { KtdDictionary } from '../types';


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

    pokemonsGen1 = pokemonsGen1;

    pokemonsGen1Dict: KtdDictionary<{ name: string, url: string, img: string }> = pokemonsGen1.reduce((acc, cur, index) => ({
        ...acc,
        [cur.name as string]: {
            ...cur,
            img: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${index + 1}.png`
        }
    }), {})

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

    onLayout2Updated(layout: KtdGridLayout) {
        console.log('onLayout2Updated', layout);
        this.layout2 = layout;
    }

}
