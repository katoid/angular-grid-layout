import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { KtdAppComponent } from './app.component';
import { KtdGridModule } from 'grid';

@NgModule({
    declarations: [
        KtdAppComponent
    ],
    imports: [
        BrowserModule,
        KtdGridModule
    ],
    providers: [],
    bootstrap: [KtdAppComponent]
})
export class KtdAppModule {}
