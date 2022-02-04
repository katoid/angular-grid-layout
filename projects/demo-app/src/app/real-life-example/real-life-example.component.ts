import { Component, Inject, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { KtdGridComponent, KtdGridLayout, ktdTrackById } from '@katoid/angular-grid-layout';
import { fromEvent, merge, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { countriesPopulation, countriesPopulationByYear } from './data/countries-population.data';
import { AreaChartStackedComponent } from '@swimlane/ngx-charts';
import { DOCUMENT } from '@angular/common';

@Component({
    selector: 'ktd-real-life-example',
    templateUrl: './real-life-example.component.html',
    styleUrls: ['./real-life-example.component.scss']
})
export class KtdRealLifeExampleComponent implements OnInit, OnDestroy {
    @ViewChild(KtdGridComponent, {static: true}) grid: KtdGridComponent;
    @ViewChildren(AreaChartStackedComponent) areaCharts: QueryList<AreaChartStackedComponent>;

    trackById = ktdTrackById;
    cols = 12;
    rowHeight = 50;
    compactType: 'vertical' | 'horizontal' | null = 'vertical';
    layout: KtdGridLayout = [
        {id: '0', x: 0, y: 5, w: 4, h: 10, minW: 2, minH: 5},
        {id: '1', x: 4, y: 5, w: 4, h: 10, minW: 2, minH: 5},
        {id: '2', x: 2, y: 0, w: 6, h: 5, minW: 4, minH: 4, maxW: 8, maxH: 14},
        {id: '5', x: 8, y: 0, w: 4, h: 5, minW: 2, minH: 3},
        {id: '3', x: 0, y: 0, w: 2, h: 5, minH: 3},
        {id: '4', x: 8, y: 5, w: 4, h: 10, minH: 5, maxH: 12}
    ];

    layoutSizes: {[id: string]: [number, number]} = {};


    countriesPopulation: any[] = countriesPopulation;
    countriesPopulationByYear: any[] = countriesPopulationByYear;

    // options
    legend: boolean = true;
    showLabels: boolean = true;
    animations: boolean = true;
    xAxis: boolean = true;
    yAxis: boolean = true;
    showYAxisLabel: boolean = true;
    showXAxisLabel: boolean = true;
    xAxisLabel: string = 'Countries';
    yAxisLabel: string = 'Population';
    timeline: boolean = true;

    colorScheme = {
        domain: ['#5AA454', '#E44D25', '#CFC0BB', '#7aa3e5', '#a8385d', '#aae3f5']
    };

    colorScheme2 = {
        domain: ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949', '#af7aa1']
    };

    colorSchemeGradientLinear = {
        domain: ['#4e79a7', '#f28e2c', '#e15759']
    };


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
            this.calculateLayoutSizes();
        });
    }

    ngOnDestroy() {
        this.resizeSubscription.unsubscribe();
    }

    getView(gridItemId: string, grid: KtdGridComponent): [number, number] {
        const gridItemRenderData = grid.getItemRenderData(gridItemId);
        return [
            gridItemRenderData.width,
            gridItemRenderData.height
        ];
    }

    onLayoutUpdated(layout: KtdGridLayout) {
        this.layout = layout;
        this.calculateLayoutSizes();
    }

    labelFormatting(c) {
        return `${(c.label)} Population`;
    }

    onSelect(id: string, data): void {
        console.log('Item clicked', JSON.parse(JSON.stringify(data)));
    }

    onActivate(id: string, data): void {
        console.log('Activate', JSON.parse(JSON.stringify(data)));
    }

    onDeactivate(id: string, data): void {
        console.log('Deactivate', JSON.parse(JSON.stringify(data)));
    }

    /**
     * Calculates and sets the property 'this.layoutSizes' with the [width, height] of every item.
     * This is needed to set manually the [width, height] for every grid item that is a chart.
     */
    private calculateLayoutSizes() {
        const gridItemsRenderData = this.grid.getItemsRenderData();
        this.layoutSizes =
            Object.keys(gridItemsRenderData)
                .reduce((acc, cur) => ({
                    ...acc,
                    [cur]: [gridItemsRenderData[cur].width, gridItemsRenderData[cur].height]
                }), {});
    }

}
