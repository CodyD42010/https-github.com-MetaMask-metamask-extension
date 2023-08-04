import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Box, BannerAlert } from '../../../components/component-library';
import ToggleButton from '../../../components/ui/toggle-button';
import TextField from '../../../components/ui/text-field';
import Button from '../../../components/ui/button';
import Dropdown from '../../../components/ui/dropdown';
import Dialog from '../../../components/ui/dialog';
import {
  Display,
  FlexDirection,
  JustifyContent,
  SEVERITIES,
  TextVariant,
} from '../../../helpers/constants/design-system';
import { getPlatform } from '../../../../app/scripts/lib/util';

import { PLATFORM_FIREFOX } from '../../../../shared/constants/app';
import {
  getNumberOfSettingsInSection,
  handleSettingsRefs,
} from '../../../helpers/utils/settings-search';

import {
  LedgerTransportTypes,
  LEDGER_USB_VENDOR_ID,
} from '../../../../shared/constants/hardware-wallets';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
} from '../../../../shared/constants/metametrics';
import { DEFAULT_AUTO_LOCK_TIME_LIMIT } from '../../../../shared/constants/preferences';
import {
  exportAsFile,
  ExportableContentType,
} from '../../../helpers/utils/export-utils';
import ActionableMessage from '../../../components/ui/actionable-message';
import ZENDESK_URLS from '../../../helpers/constants/zendesk-url';

const CORRUPT_JSON_FILE = 'CORRUPT_JSON_FILE';

export default class AdvancedTab extends PureComponent {
  static contextTypes = {
    t: PropTypes.func,
    trackEvent: PropTypes.func,
  };

  static propTypes = {
    setUseNonceField: PropTypes.func,
    useNonceField: PropTypes.bool,
    setHexDataFeatureFlag: PropTypes.func,
    displayWarning: PropTypes.func,
    showResetAccountConfirmationModal: PropTypes.func,
    showEthSignModal: PropTypes.func,
    warning: PropTypes.string,
    sendHexData: PropTypes.bool,
    showFiatInTestnets: PropTypes.bool,
    showTestNetworks: PropTypes.bool,
    autoLockTimeLimit: PropTypes.number,
    setAutoLockTimeLimit: PropTypes.func.isRequired,
    setShowFiatConversionOnTestnetsPreference: PropTypes.func.isRequired,
    setShowTestNetworks: PropTypes.func.isRequired,
    ledgerTransportType: PropTypes.oneOf(Object.values(LedgerTransportTypes)),
    setLedgerTransportPreference: PropTypes.func.isRequired,
    setDismissSeedBackUpReminder: PropTypes.func.isRequired,
    dismissSeedBackUpReminder: PropTypes.bool.isRequired,
    userHasALedgerAccount: PropTypes.bool.isRequired,
    backupUserData: PropTypes.func.isRequired,
    restoreUserData: PropTypes.func.isRequired,
    setDisabledRpcMethodPreference: PropTypes.func.isRequired,
    disabledRpcMethodPreferences: PropTypes.shape({
      eth_sign: PropTypes.bool.isRequired,
    }),
    ///: BEGIN:ONLY_INCLUDE_IN(desktop)
    desktopEnabled: PropTypes.bool,
    ///: END:ONLY_INCLUDE_IN
  };

  state = {
    autoLockTimeLimit: this.props.autoLockTimeLimit,
    autoLockTimeLimitBeforeNormalization: this.props.autoLockTimeLimit,
    lockTimeError: '',
    showLedgerTransportWarning: false,
    showResultMessage: false,
    restoreSuccessful: true,
    restoreMessage: null,
  };

  settingsRefs = Array(
    getNumberOfSettingsInSection(this.context.t, this.context.t('advanced')),
  )
    .fill(undefined)
    .map(() => {
      return React.createRef();
    });

  componentDidUpdate() {
    const { t } = this.context;
    handleSettingsRefs(t, t('advanced'), this.settingsRefs);
  }

  componentDidMount() {
    const { t } = this.context;
    handleSettingsRefs(t, t('advanced'), this.settingsRefs);
  }

  async getTextFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new window.FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        resolve(text);
      };

      reader.onerror = (e) => {
        reject(e);
      };

      reader.readAsText(file);
    });
  }

  async handleFileUpload(event) {
    /**
     * we need this to be able to access event.target after
     * the event handler has been called. [Synthetic Event Pooling, pre React 17]
     *
     * @see https://fb.me/react-event-pooling
     */
    event.persist();
    const file = event.target.files[0];
    const jsonString = await this.getTextFromFile(file);
    /**
     * so that we can restore same file again if we want to.
     * chrome blocks uploading same file twice.
     */
    event.target.value = '';
    try {
      const result = await this.props.restoreUserData(jsonString);
      this.setState({
        showResultMessage: true,
        restoreSuccessful: result,
        restoreMessage: null,
      });
    } catch (e) {
      if (e.message.match(/Unexpected.+JSON/iu)) {
        this.setState({
          showResultMessage: true,
          restoreSuccessful: false,
          restoreMessage: CORRUPT_JSON_FILE,
        });
      }
    }
  }

  backupUserData = async () => {
    const { fileName, data } = await this.props.backupUserData();
    exportAsFile(fileName, data, ExportableContentType.JSON);

    this.context.trackEvent({
      event: 'User Data Exported',
      category: 'Backup',
      properties: {},
    });
  };

  renderStateLogs() {
    const { t } = this.context;
    const { displayWarning } = this.props;

    return (
      <Box
        className="settings-page__content-row"
        display={Display.Flex}
        flexDirection={FlexDirection.Column}
        ref={this.settingsRefs[0]}
        data-testid="advanced-setting-state-logs"
      >
        <div className="settings-page__content-item">
          <span>{t('stateLogs')}</span>
          <span className="settings-page__content-description">
            {t('stateLogsDescription')}
          </span>
        </div>
        <div className="settings-page__content-item">
          <div className="settings-page__content-item-col">
            <Button
              type="secondary"
              large
              onClick={() => {
                window.logStateString((err, result) => {
                  if (err) {
                    displayWarning(t('stateLogError'));
                  } else {
                    exportAsFile(
                      `${t('stateLogFileName')}.json`,
                      result,
                      ExportableContentType.JSON,
                    );
                  }
                });
              }}
            >
              {t('downloadStateLogs')}
            </Button>
          </div>
        </div>
      </Box>
    );
  }

  renderResetAccount() {
    const { t } = this.context;
    const { showResetAccountConfirmationModal } = this.props;

    return (
      <Box
        ref={this.settingsRefs[1]}
        className="settings-page__content-row"
        display={Display.Flex}
        flexDirection={FlexDirection.Column}
        data-testid="advanced-setting-reset-account"
      >
        <div className="settings-page__content-item">
          <span>{t('clearActivity')}</span>
          <span className="settings-page__content-description">
            {t('clearActivityDescription')}
          </span>
        </div>
        <div className="settings-page__content-item">
          <div className="settings-page__content-item-col">
            <Button
              type="danger"
              large
              className="settings-tab__button--red"
              onClick={(event) => {
                event.preventDefault();
                this.context.trackEvent({
                  category: MetaMetricsEventCategory.Settings,
                  event: MetaMetricsEventName.AccountReset,
                  properties: {},
                });
                showResetAccountConfirmationModal();
              }}
            >
              {t('clearActivityButton')}
            </Button>
          </div>
        </div>
      </Box>
    );
  }

  renderHexDataOptIn() {
    const { t } = this.context;
    const { sendHexData, setHexDataFeatureFlag } = this.props;

    return (
      <Box
        ref={this.settingsRefs[2]}
        className="settings-page__content-row"
        display={Display.Flex}
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
        data-testid="advanced-setting-hex-data"
      >
        <div className="settings-page__content-item">
          <span>{t('showHexData')}</span>
          <div className="settings-page__content-description">
            {t('showHexDataDescription')}
          </div>
        </div>
        <div className="settings-page__content-item-col">
          <ToggleButton
            value={sendHexData}
            onToggle={(value) => setHexDataFeatureFlag(!value)}
            offLabel={t('off')}
            onLabel={t('on')}
          />
        </div>
      </Box>
    );
  }

  renderShowConversionInTestnets() {
    const { t } = this.context;
    const { showFiatInTestnets, setShowFiatConversionOnTestnetsPreference } =
      this.props;

    return (
      <Box
        ref={this.settingsRefs[3]}
        className="settings-page__content-row"
        display={Display.Flex}
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
        data-testid="advanced-setting-show-testnet-conversion"
      >
        <div className="settings-page__content-item">
          <span>{t('showFiatConversionInTestnets')}</span>
          <div className="settings-page__content-description">
            {t('showFiatConversionInTestnetsDescription')}
          </div>
        </div>

        <div className="settings-page__content-item-col">
          <ToggleButton
            value={showFiatInTestnets}
            onToggle={(value) =>
              setShowFiatConversionOnTestnetsPreference(!value)
            }
            offLabel={t('off')}
            onLabel={t('on')}
          />
        </div>
      </Box>
    );
  }

  renderToggleTestNetworks() {
    const { t } = this.context;
    const { showTestNetworks, setShowTestNetworks } = this.props;

    return (
      <Box
        ref={this.settingsRefs[4]}
        className="settings-page__content-row"
        data-testid="advanced-setting-show-testnet-conversion"
        display={Display.Flex}
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
      >
        <div className="settings-page__content-item">
          <span>{t('showTestnetNetworks')}</span>
          <div className="settings-page__content-description">
            {t('showTestnetNetworksDescription')}
          </div>
        </div>

        <div className="settings-page__content-item-col">
          <ToggleButton
            value={showTestNetworks}
            onToggle={(value) => setShowTestNetworks(!value)}
            offLabel={t('off')}
            onLabel={t('on')}
          />
        </div>
      </Box>
    );
  }

  renderUseNonceOptIn() {
    const { t } = this.context;
    const { useNonceField, setUseNonceField } = this.props;

    return (
      <Box
        ref={this.settingsRefs[5]}
        className="settings-page__content-row"
        data-testid="advanced-setting-custom-nonce"
        display={Display.Flex}
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
      >
        <div className="settings-page__content-item">
          <span>{t('nonceField')}</span>
          <div className="settings-page__content-description">
            {t('nonceFieldDescription')}
          </div>
        </div>

        <div className="settings-page__content-item-col">
          <ToggleButton
            value={useNonceField}
            onToggle={(value) => setUseNonceField(!value)}
            offLabel={t('off')}
            onLabel={t('on')}
          />
        </div>
      </Box>
    );
  }

  renderAutoLockTimeLimit() {
    const { t } = this.context;
    const { lockTimeError } = this.state;
    const { setAutoLockTimeLimit } = this.props;

    return (
      <Box
        ref={this.settingsRefs[6]}
        className="settings-page__content-row"
        data-testid="advanced-setting-auto-lock"
        display={Display.Flex}
        flexDirection={FlexDirection.Column}
      >
        <div className="settings-page__content-item">
          <span>{t('autoLockTimeLimit')}</span>
          <div className="settings-page__content-description">
            {t('autoLockTimeLimitDescription')}
          </div>
        </div>
        <div className="settings-page__content-item">
          <div className="settings-page__content-item-col">
            <TextField
              id="autoTimeout"
              data-testid="auto-lockout-time"
              placeholder="0"
              value={this.state.autoLockTimeLimitBeforeNormalization}
              onChange={(e) => this.handleLockChange(e.target.value)}
              error={lockTimeError}
              fullWidth
              margin="dense"
              min={0}
            />
            <Button
              type="primary"
              data-testid="auto-lockout-button"
              className="settings-tab__rpc-save-button"
              disabled={lockTimeError !== ''}
              onClick={() => {
                setAutoLockTimeLimit(this.state.autoLockTimeLimit);
              }}
            >
              {t('save')}
            </Button>
          </div>
        </div>
      </Box>
    );
  }

  renderLedgerLiveControl() {
    const { t } = this.context;
    const {
      ledgerTransportType,
      setLedgerTransportPreference,
      userHasALedgerAccount,
      ///: BEGIN:ONLY_INCLUDE_IN(desktop)
      desktopEnabled,
      ///: END:ONLY_INCLUDE_IN
    } = this.props;

    ///: BEGIN:ONLY_INCLUDE_IN(desktop)
    if (desktopEnabled) {
      return null;
    }
    ///: END:ONLY_INCLUDE_IN

    const LEDGER_TRANSPORT_NAMES = {
      LIVE: t('ledgerLive'),
      WEBHID: t('webhid'),
      U2F: t('u2f'),
    };

    const transportTypeOptions = [
      {
        name: LEDGER_TRANSPORT_NAMES.LIVE,
        value: LedgerTransportTypes.live,
      },
      {
        name: LEDGER_TRANSPORT_NAMES.U2F,
        value: LedgerTransportTypes.u2f,
      },
    ];

    if (window.navigator.hid) {
      transportTypeOptions.push({
        name: LEDGER_TRANSPORT_NAMES.WEBHID,
        value: LedgerTransportTypes.webhid,
      });
    }

    const recommendedLedgerOption = window.navigator.hid
      ? LEDGER_TRANSPORT_NAMES.WEBHID
      : LEDGER_TRANSPORT_NAMES.U2F;

    return (
      <Box
        ref={this.settingsRefs[7]}
        className="settings-page__content-row"
        data-testid="ledger-live-control"
        display={Display.Flex}
        flexDirection={FlexDirection.Column}
      >
        <div className="settings-page__content-item">
          <span>{t('preferredLedgerConnectionType')}</span>
          <div className="settings-page__content-description">
            {t('ledgerConnectionPreferenceDescription', [
              recommendedLedgerOption,
              <Button
                key="ledger-connection-settings-learn-more"
                type="link"
                href={ZENDESK_URLS.HARDWARE_CONNECTION}
                target="_blank"
                rel="noopener noreferrer"
                className="settings-page__inline-link"
              >
                {t('learnMore')}
              </Button>,
            ])}
          </div>
        </div>
        <div className="settings-page__content-item">
          <div className="settings-page__content-item-col">
            <Dropdown
              id="select-ledger-transport-type"
              options={transportTypeOptions}
              selectedOption={ledgerTransportType}
              onChange={async (transportType) => {
                if (
                  ledgerTransportType === LedgerTransportTypes.live &&
                  transportType === LedgerTransportTypes.webhid
                ) {
                  this.setState({ showLedgerTransportWarning: true });
                }
                setLedgerTransportPreference(transportType);
                if (
                  transportType === LedgerTransportTypes.webhid &&
                  userHasALedgerAccount
                ) {
                  await window.navigator.hid.requestDevice({
                    filters: [{ vendorId: LEDGER_USB_VENDOR_ID }],
                  });
                }
              }}
            />
            {this.state.showLedgerTransportWarning ? (
              <Dialog type="message">
                <div className="settings-page__content-item-dialog">
                  {t('ledgerTransportChangeWarning')}
                </div>
              </Dialog>
            ) : null}
          </div>
        </div>
      </Box>
    );
  }

  renderDismissSeedBackupReminderControl() {
    const { t } = this.context;
    const { dismissSeedBackUpReminder, setDismissSeedBackUpReminder } =
      this.props;

    return (
      <Box
        ref={this.settingsRefs[8]}
        className="settings-page__content-row"
        data-testid="advanced-setting-dismiss-reminder"
        display={Display.Flex}
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
      >
        <div className="settings-page__content-item">
          <span>{t('dismissReminderField')}</span>
          <div className="settings-page__content-description">
            {t('dismissReminderDescriptionField')}
          </div>
        </div>

        <div className="settings-page__content-item-col">
          <ToggleButton
            value={dismissSeedBackUpReminder}
            onToggle={(value) => setDismissSeedBackUpReminder(!value)}
            offLabel={t('off')}
            onLabel={t('on')}
          />
        </div>
      </Box>
    );
  }

  renderToggleEthSignControl() {
    const { t, trackEvent } = this.context;
    const {
      disabledRpcMethodPreferences,
      showEthSignModal,
      setDisabledRpcMethodPreference,
    } = this.props;
    const toggleOff = (value) => {
      setDisabledRpcMethodPreference('eth_sign', !value);
      trackEvent({
        category: MetaMetricsEventCategory.Settings,
        event: MetaMetricsEventName.OnboardingWalletAdvancedSettings,
        properties: {
          location: 'Settings',
          enable_eth_sign: false,
        },
      });
    };
    return (
      <Box
        ref={this.settingsRefs[9]}
        className="settings-page__content-row"
        data-testid="advanced-setting-toggle-ethsign"
        display={Display.Flex}
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
      >
        <div className="settings-page__content-item">
          <span>{t('toggleEthSignField')}</span>
          <div className="settings-page__content-description">
            {t('toggleEthSignDescriptionField')}
          </div>
        </div>

        {disabledRpcMethodPreferences?.eth_sign ? (
          <BannerAlert
            severity={SEVERITIES.DANGER}
            marginBottom={5}
            descriptionProps={{ variant: TextVariant.bodyMd }}
          >
            {t('toggleEthSignBannerDescription')}
          </BannerAlert>
        ) : null}

        <div className="settings-page__content-item-col">
          <ToggleButton
            className="eth-sign-toggle"
            value={disabledRpcMethodPreferences?.eth_sign || false}
            onToggle={(value) => {
              value ? toggleOff(value) : showEthSignModal();
            }}
            offLabel={t('toggleEthSignOff')}
            onLabel={t('toggleEthSignOn')}
          />
        </div>
      </Box>
    );
  }

  handleLockChange(autoLockTimeLimitBeforeNormalization) {
    const { t } = this.context;

    if (autoLockTimeLimitBeforeNormalization === '') {
      this.setState({
        autoLockTimeLimitBeforeNormalization,
        autoLockTimeLimit: DEFAULT_AUTO_LOCK_TIME_LIMIT.toString(),
        lockTimeError: '',
      });
      return;
    }

    const autoLockTimeLimitAfterNormalization = Number(
      autoLockTimeLimitBeforeNormalization,
    );

    if (
      Number.isNaN(autoLockTimeLimitAfterNormalization) ||
      autoLockTimeLimitAfterNormalization < 0 ||
      autoLockTimeLimitAfterNormalization > 10080
    ) {
      this.setState({
        autoLockTimeLimitBeforeNormalization,
        autoLockTimeLimit: null,
        lockTimeError: t('lockTimeInvalid'),
      });
      return;
    }

    const autoLockTimeLimit = autoLockTimeLimitAfterNormalization;

    this.setState({
      autoLockTimeLimitBeforeNormalization,
      autoLockTimeLimit,
      lockTimeError: '',
    });
  }

  renderUserDataBackup() {
    const { t } = this.context;
    return (
      <Box
        ref={this.settingsRefs[10]}
        className="settings-page__content-row"
        data-testid="advanced-setting-data-backup"
        display={Display.Flex}
        flexDirection={FlexDirection.Column}
      >
        <div className="settings-page__content-item">
          <span>{t('backupUserData')}</span>
          <span className="settings-page__content-description">
            {t('backupUserDataDescription')}
          </span>
        </div>
        <div className="settings-page__content-item">
          <div className="settings-page__content-item-col">
            <Button
              data-testid="backup-button"
              type="secondary"
              large
              onClick={() => this.backupUserData()}
            >
              {t('backup')}
            </Button>
          </div>
        </div>
      </Box>
    );
  }

  renderRestoreUserData() {
    const { t } = this.context;
    const { showResultMessage, restoreSuccessful, restoreMessage } = this.state;

    const defaultRestoreMessage = restoreSuccessful
      ? t('restoreSuccessful')
      : t('restoreFailed');
    const restoreMessageToRender =
      restoreMessage === CORRUPT_JSON_FILE
        ? t('dataBackupSeemsCorrupt')
        : defaultRestoreMessage;

    return (
      <Box
        ref={this.settingsRefs[11]}
        className="settings-page__content-row"
        data-testid="advanced-setting-data-restore"
        display={Display.Flex}
        flexDirection={FlexDirection.Column}
      >
        <div className="settings-page__content-item">
          <span>{t('restoreUserData')}</span>
          <span className="settings-page__content-description">
            {t('restoreUserDataDescription')}
          </span>
        </div>
        <div className="settings-page__content-item">
          <div className="settings-page__content-item-col">
            <label
              htmlFor="restore-file"
              className="button btn btn--rounded btn-secondary btn--large settings-page__button"
            >
              {t('restore')}
            </label>
            <input
              id="restore-file"
              data-testid="restore-file"
              style={{ visibility: 'hidden' }}
              type="file"
              accept=".json"
              onChange={(e) => this.handleFileUpload(e)}
            />
          </div>
          {showResultMessage && (
            <ActionableMessage
              type={restoreSuccessful ? 'success' : 'danger'}
              message={restoreMessageToRender}
              primaryActionV2={{
                label: t('dismiss'),
                onClick: () => {
                  this.setState({
                    showResultMessage: false,
                    restoreSuccessful: true,
                    restoreMessage: null,
                  });
                },
              }}
            />
          )}
        </div>
      </Box>
    );
  }

  render() {
    const { warning } = this.props;

    const notUsingFirefox = getPlatform() !== PLATFORM_FIREFOX;

    return (
      <div className="settings-page__body">
        {warning ? <div className="settings-tab__error">{warning}</div> : null}
        {this.renderStateLogs()}
        {this.renderResetAccount()}
        {this.renderHexDataOptIn()}
        {this.renderShowConversionInTestnets()}
        {this.renderToggleTestNetworks()}
        {this.renderUseNonceOptIn()}
        {this.renderAutoLockTimeLimit()}
        {this.renderUserDataBackup()}
        {this.renderRestoreUserData()}
        {notUsingFirefox ? this.renderLedgerLiveControl() : null}
        {this.renderDismissSeedBackupReminderControl()}
        {this.renderToggleEthSignControl()}
      </div>
    );
  }
}
