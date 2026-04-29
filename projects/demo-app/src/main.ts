import { appConfig } from './app/app.config';
import { bootstrapApplication } from '@angular/platform-browser';
import { KtdAppComponent } from './app/app.component';

bootstrapApplication(KtdAppComponent, appConfig)
  .catch(err => console.error(err));
