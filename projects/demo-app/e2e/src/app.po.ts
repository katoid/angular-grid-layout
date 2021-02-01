import { browser, by, element } from 'protractor';

export class KtdAppPage {
  async navigateTo(): Promise<unknown> {
    return browser.get(browser.baseUrl);
  }

  async getTitleText(): Promise<string> {
    return element(by.css('ktd-root ktd-playground h1')).getText();
  }
}
