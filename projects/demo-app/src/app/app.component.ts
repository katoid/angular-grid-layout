import { Component } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router, RoutesRecognized } from '@angular/router';

const defaultTitle = 'Angular Grid Layout';

@Component({
    selector: 'ktd-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class KtdAppComponent {
    title: string = defaultTitle;

    constructor(private matIconRegistry: MatIconRegistry, private domSanitizer: DomSanitizer, private router: Router, private readonly route: ActivatedRoute) {
        this.matIconRegistry.addSvgIcon(
            `github`,
            this.domSanitizer.bypassSecurityTrustResourceUrl(`assets/logos/github.svg`)
        );

        this.router.events.subscribe((data) => {
            if (data instanceof RoutesRecognized) {
                this.title = data.state.root.firstChild?.data.title || defaultTitle;
            }
        });
    }
}
