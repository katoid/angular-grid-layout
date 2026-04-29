import { NgFor } from '@angular/common';
import { Component, DestroyRef, DOCUMENT, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    KtdGridComponent, KtdGridLayout, KtdGridItemComponent, KtdGridItemPlaceholder, KtdGridDragHandle
} from '@katoid/angular-grid-layout';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import {
    GridComponent,
    LegendComponent,
    TooltipComponent,
    VisualMapComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { EChartsCoreOption } from 'echarts/core';
import { fromEvent, merge } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

import { countriesPopulation, countriesPopulationByYear } from './data/countries-population.data';
import { KtdFooterComponent } from '../components/footer/footer.component';
import { KtdTableSortingComponent } from './table-sorting/table-sorting.component';

echarts.use([
    BarChart,
    PieChart,
    GridComponent,
    LegendComponent,
    TooltipComponent,
    VisualMapComponent,
    CanvasRenderer
]);

type CountryPopulation = {
    name: string;
    value: number;
};

type CountryPopulationSeries = {
    name: string;
    series: Array<{
        name: string;
        value: number;
    }>;
};

const chartPalette = ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949'];
type TreemapTile = {
    name: string;
    value: number;
    color: string;
    darkText?: boolean;
};

type PieSlice = {
    name: string;
    value: number;
    color: string;
};

type HistoricalCountry = {
    name: string;
    series: Array<{
        name: string;
        value: number;
    }>;
};

@Component({
    selector: 'ktd-real-life-example',
    standalone: true,
    templateUrl: './real-life-example.component.html',
    styleUrls: ['./real-life-example.component.scss'],
    imports: [
        KtdGridComponent,
        KtdGridItemComponent,
        KtdGridItemPlaceholder,
        KtdGridDragHandle,
        KtdTableSortingComponent,
        KtdFooterComponent,
        NgFor,
        NgxEchartsDirective
    ],
    providers: [
        provideEchartsCore({ echarts })
    ]
})
export class KtdRealLifeExampleComponent implements OnInit {
    @ViewChild(KtdGridComponent, { static: true }) grid: KtdGridComponent;
    private readonly destroyRef = inject(DestroyRef);
    readonly document = inject<Document>(DOCUMENT);

    cols = 12;
    rowHeight = 50;
    compactType: 'vertical' | 'horizontal' | null = 'vertical';
    layout: KtdGridLayout = [
        { id: '3', x: 0, y: 0, w: 2, h: 5, minW: 2, minH: 3 },
        { id: '2', x: 2, y: 0, w: 6, h: 5, minW: 4, minH: 4, maxW: 8, maxH: 14 },
        { id: '5', x: 8, y: 0, w: 4, h: 5, minW: 2, minH: 3 },
        { id: '0', x: 0, y: 5, w: 4, h: 10, minW: 2, minH: 5 },
        { id: '1', x: 4, y: 5, w: 4, h: 10, minW: 2, minH: 5 },
        { id: '4', x: 8, y: 5, w: 4, h: 10, minW: 3, minH: 5, maxH: 12 }
    ];

    readonly countriesPopulation: CountryPopulation[] = countriesPopulation;
    readonly countriesPopulationByYear: CountryPopulationSeries[] = countriesPopulationByYear;
    readonly historicalCountries: HistoricalCountry[] = this.countriesPopulationByYear.map((country) => ({
        name: country.name,
        series: [...country.series]
    }));
    readonly countryNames = this.historicalCountries.map((country) => country.name);
    readonly years = this.getAllYears();
    readonly treemapColumns: TreemapTile[][] = [
        [
            { name: 'Germany', value: 8940000, color: '#60a854', darkText: true },
            { name: 'USA', value: 5000000, color: '#ef4d20' }
        ],
        [
            { name: 'France', value: 7200000, color: '#d6c8c2', darkText: true },
            { name: 'Italy', value: 4500000, color: '#7d9fe0', darkText: true }
        ],
        [
            { name: 'Spain', value: 5730000, color: '#b13c67' },
            { name: 'UK', value: 8200000, color: '#a8ddf2', darkText: true }
        ]
    ];
    readonly pieSlices: PieSlice[] = [
        { name: 'Germany', value: 8940000, color: '#60a854' },
        { name: 'USA', value: 5000000, color: '#ef4d20' },
        { name: 'France', value: 7200000, color: '#d6c8c2' },
        { name: 'Italy', value: 4500000, color: '#7d9fe0' },
        { name: 'Spain', value: 5730000, color: '#b13c67' },
        { name: 'UK', value: 8200000, color: '#a8ddf2' }
    ];

    readonly populationByYearChart = this.createStackedBarChart(false);
    readonly populationByYearPlaceholderChart = this.createStackedBarChart(true);
    readonly populationHorizontalChart = this.createHorizontalBarChart(false);
    readonly populationHorizontalPlaceholderChart = this.createHorizontalBarChart(true);
    readonly populationPieChart = this.createPieChart(false);
    readonly populationPiePlaceholderChart = this.createPieChart(true);

    ngOnInit() {
        merge(
            fromEvent(window, 'resize'),
            fromEvent(window, 'orientationchange')
        ).pipe(
            debounceTime(50),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => {
            this.grid.resize();
        });
    }

    onLayoutUpdated(layout: KtdGridLayout) {
        this.layout = layout;
    }

    private getAllYears(): string[] {
        const years = new Set<string>();

        this.countriesPopulationByYear.forEach((country) => {
            country.series.forEach((point) => years.add(point.name));
        });

        return Array.from(years).sort((a, b) => Number(a) - Number(b));
    }

    private createStackedBarChart(placeholder: boolean): EChartsCoreOption {
        return {
            color: chartPalette,
            animation: !placeholder,
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            legend: {
                top: 28,
                right: 12,
                orient: 'vertical',
                itemWidth: 20,
                itemHeight: 20,
                textStyle: {
                    color: '#c7cfdf',
                    fontSize: 14
                },
                backgroundColor: '#c6c6c6',
                borderRadius: 4,
                padding: [10, 14]
            },
            graphic: [
                {
                    type: 'text',
                    right: 16,
                    top: 2,
                    style: {
                        text: 'Legend',
                        fill: '#111',
                        font: '700 18px Arial'
                    }
                }
            ],
            grid: {
                left: 44,
                right: 124,
                top: 18,
                bottom: 48,
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: this.countryNames,
                name: 'Countries',
                nameLocation: 'middle',
                nameGap: 32,
                nameTextStyle: {
                    color: '#111',
                    fontSize: 18
                },
                axisLine: {
                    lineStyle: {
                        color: '#777'
                    }
                },
                axisLabel: {
                    color: '#1f1f1f'
                },
                axisTick: {
                    alignWithLabel: true
                }
            },
            yAxis: {
                type: 'value',
                name: 'Population',
                nameLocation: 'middle',
                nameGap: 84,
                nameTextStyle: {
                    color: '#111',
                    fontSize: 18
                },
                max: 880000000,
                axisLine: {
                    lineStyle: {
                        color: '#777'
                    }
                },
                splitLine: {
                    lineStyle: {
                        color: 'rgba(255, 255, 255, 0.42)'
                    }
                },
                axisLabel: {
                    color: '#1f1f1f'
                }
            },
            series: this.years.map((year, index) => ({
                name: year,
                type: 'bar',
                stack: 'population',
                barWidth: 66,
                barCategoryGap: '18%',
                emphasis: {
                    focus: 'series'
                },
                data: this.countryNames.map((name) => this.findPopulationByYear(name, year)),
                itemStyle: {
                    color: chartPalette[index % chartPalette.length]
                }
            }))
        };
    }

    private createHorizontalBarChart(placeholder: boolean): EChartsCoreOption {
        return {
            color: chartPalette,
            animation: !placeholder,
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            grid: {
                left: 78,
                right: 22,
                top: 18,
                bottom: 24,
                containLabel: true
            },
            xAxis: {
                type: 'value',
                max: 320000000,
                name: 'Population',
                nameLocation: 'middle',
                nameGap: 42,
                nameTextStyle: {
                    color: '#111',
                    fontSize: 18
                },
                axisLabel: {
                    color: '#1f1f1f'
                },
                splitLine: {
                    lineStyle: {
                        color: 'rgba(255, 255, 255, 0.35)'
                    }
                }
            },
            yAxis: {
                type: 'category',
                data: this.countryNames,
                inverse: true,
                name: 'Countries',
                nameLocation: 'middle',
                nameGap: 48,
                nameRotate: 90,
                nameTextStyle: {
                    color: '#111',
                    fontSize: 18
                },
                axisLabel: {
                    color: '#1f1f1f'
                },
                splitLine: {
                    show: true,
                    lineStyle: {
                        color: 'rgba(255, 255, 255, 0.18)',
                        width: 28
                    }
                }
            },
            series: this.years.map((year, index) => ({
                name: year,
                type: 'bar',
                barWidth: 12,
                barGap: '28%',
                barCategoryGap: '48%',
                data: this.countryNames.map((country) => this.findPopulationByYear(country, year)),
                itemStyle: {
                    borderRadius: [0, 6, 6, 0],
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 1,
                        y2: 0,
                        colorStops: [
                            { offset: 0, color: '#5b84b0' },
                            { offset: 0.45, color: '#d19a57' },
                            { offset: 1, color: chartPalette[index % chartPalette.length] }
                        ]
                    }
                }
            }))
        };
    }

    private createPieChart(placeholder: boolean): EChartsCoreOption {
        return {
            animation: !placeholder,
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                formatter: (params: { name: string; value: number; percent: number }) =>
                    `${params.name}: ${params.value.toLocaleString('en-US')} (${params.percent}%)`
            },
            legend: {
                show: false,
                textStyle: {
                    color: '#243040'
                }
            },
            series: [
                {
                    type: 'pie',
                    radius: ['0%', '58%'],
                    center: ['50%', '48%'],
                    startAngle: 90,
                    clockwise: true,
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderWidth: 0
                    },
                    label: {
                        color: '#1f1f1f',
                        formatter: '{b}',
                        fontSize: 14
                    },
                    labelLine: {
                        length: 24,
                        length2: 42,
                        smooth: false
                    },
                    data: this.pieSlices.map((slice) => ({
                        name: slice.name,
                        value: slice.value,
                        itemStyle: {
                            color: slice.color
                        }
                    }))
                }
            ]
        };
    }

    private findPopulationByYear(countryName: string, year: string): number | null {
        return this.countriesPopulationByYear.find((country) => country.name === countryName)?.series.find((entry) => entry.name === year)?.value ?? null;
    }

    formatPopulation(value: number): string {
        return value.toLocaleString('it-IT');
    }
}
