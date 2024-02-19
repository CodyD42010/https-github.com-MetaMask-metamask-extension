import { type Locator, type Page } from '@playwright/test';

export class SwapPage {
  static extensionId: string | undefined;

  private page: Page;

  private clearSmartTranModalDone: boolean;

  readonly swapButton: Locator;

  readonly manageSettingsButton: Locator;

  readonly toggleSmartSwap: Locator;

  readonly updateSettingsButton: Locator;

  readonly swapFromDropDown: Locator;

  readonly swapToDropDown: Locator;

  readonly tokenSearch: Locator;

  readonly tokenList: Locator;

  readonly tokenQty: Locator;

  readonly fetchQuoteButton: Locator;

  readonly swapTokenButton: Locator;

  readonly backButton: Locator;

  readonly switchTokensButton: Locator;

  readonly importTokensButton: Locator;

  readonly closeButton: Locator;

  readonly importButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.swapButton = this.page.getByTestId('token-overview-button-swap');
    this.manageSettingsButton = this.page.getByRole('button', {
      name: 'Manage in settings',
    });
    this.toggleSmartSwap = this.page.locator('text="On"');
    this.updateSettingsButton = this.page.getByTestId(
      'update-transaction-settings-button',
    );
    this.swapFromDropDown = this.page.getByTestId(
      'prepare-swap-page-swap-from',
    );
    this.swapToDropDown = this.page.getByTestId('prepare-swap-page-swap-to');
    this.switchTokensButton = this.page.getByTestId(
      'prepare-swap-page-switch-tokens',
    );
    this.importTokensButton = this.page.getByText('Import tokens').first();
    this.importButton = this.page.getByText('Import (');
    this.tokenSearch = this.page.locator(
      '[id="list-with-search__text-search"]',
    );
    this.tokenList = this.page.getByTestId(
      'searchable-item-list-primary-label',
    );
    this.tokenQty = this.page.getByTestId(
      'prepare-swap-page-from-token-amount',
    );
    this.fetchQuoteButton = this.page.getByText('Fetch quote');
    this.swapTokenButton = this.page.getByText('Swap');
    this.closeButton = this.page.getByText('Close');
    this.backButton = this.page.locator('[title="Cancel"]');
  }

  async fetchQuote(options) {
    await this.swapButton.click();
    if (!this.clearSmartTranModalDone) {
      this.clearSmartTranModalDone = true;
      await this.manageSettingsButton.click();
      await this.page.waitForTimeout(1000);
      await this.toggleSmartSwap.click();
      await this.updateSettingsButton.click();
    }
    await this.page.waitForTimeout(1000);
    if (options.from) {
      this.swapFromDropDown.click();
      await this.tokenSearch.fill(options.from);
      await this.page.waitForTimeout(500);
      await this.tokenList.first().click();
    }
    await this.tokenQty.fill(options.qty);
    await this.swapToDropDown.click();
    await this.page.waitForTimeout(2000);
    await this.tokenSearch.fill(options.to);
    await this.page.waitForTimeout(1000);
    await this.tokenList.first().click();
    await this.page.waitForSelector('text=/New quotes in 0:26/');
  }

  async swap() {
    const swapAnywayButton = await this.page.$('text=/Swap anyway/');
    if (swapAnywayButton) {
      // Click only if it is present
      await swapAnywayButton.click();
    }
    await this.swapTokenButton.last().click(); // Swap button
    await this.page.waitForTimeout(1000);
  }

  async switchTokens() {
    await this.switchTokensButton.click();
    await this.page.waitForTimeout(2000);
    await this.page.waitForSelector('text=/New quotes in 0:26/');
  }

  async importTokens() {
    await this.importTokensButton.click();
    await this.page.waitForTimeout(500);
    await this.importButton.click();
  }

  async gotBack() {
    await this.backButton.click();
  }

  async waitForTransactionToComplete() {
    await this.page.waitForSelector('text=/Transaction complete/');
    await this.closeButton.click(); // Close button
  }

  async waitForInsufficentBalance() {
    await this.page.waitForSelector('text="Insufficient balance"');
  }
}
