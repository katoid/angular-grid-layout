import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { KtdAppComponent } from './app.component';
import { KtdAppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
    declarations: [
        KtdAppComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        KtdAppRoutingModule
    ],
    providers: [],
    bootstrap: [KtdAppComponent]
})
export class KtdAppModule {}
