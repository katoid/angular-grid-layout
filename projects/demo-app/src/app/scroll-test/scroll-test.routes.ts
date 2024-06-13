import { KtdScrollTestComponent } from './scroll-test.component';
import { Routes } from '@angular/router';

export const SCROLL_TEST_ROUTES: Routes = [
    {
        path: '',
        component: KtdScrollTestComponent,
        data: {title: 'Angular Grid Layout - Scroll test'}
    },
];
