import { KtdRealLifeExampleComponent } from './real-life-example.component';
import { Routes } from '@angular/router';

export const REAL_LIFE_ROUTES: Routes = [
    {
        path: '',
        component: KtdRealLifeExampleComponent,
        data: {title: 'Angular Grid Layout - Real life example'}
    },
];
