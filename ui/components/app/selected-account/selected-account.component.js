import React, { Component } from 'react';
import PropTypes from 'prop-types';
import copyToClipboard from 'copy-to-clipboard';
import { shortenAddress } from '../../../helpers/utils/util';

import Tooltip from '../../ui/tooltip';
import { toChecksumHexAddress } from '../../../../shared/modules/hexstring-utils';
import { SECOND } from '../../../../shared/constants/time';
///: BEGIN:ONLY_INCLUDE_IN(build-mmi)
import { getEnvironmentType } from '../../../../app/scripts/lib/util';
import { ENVIRONMENT_TYPE_POPUP } from '../../../../shared/constants/app';
import CustodyLabels from '../../institutional/custody-labels/custody-labels';
///: END:ONLY_INCLUDE_IN
import { Icon, IconName, IconSize } from '../../component-library';
import { IconColor } from '../../../helpers/constants/design-system';

class SelectedAccount extends Component {
  state = {
    copied: false,
  };

  static contextTypes = {
    t: PropTypes.func,
  };

  static propTypes = {
    selectedIdentity: PropTypes.object.isRequired,
    ///: BEGIN:ONLY_INCLUDE_IN(build-mmi)
    accountType: PropTypes.string,
    accountDetails: PropTypes.object,
    provider: PropTypes.object,
    isCustodianSupportedChain: PropTypes.bool,
    ///: END:ONLY_INCLUDE_IN
  };

  componentDidMount() {
    this.copyTimeout = null;
  }

  componentWillUnmount() {
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
      this.copyTimeout = null;
    }
  }

  render() {
    const { t } = this.context;
    const {
      selectedIdentity,
      ///: BEGIN:ONLY_INCLUDE_IN(build-mmi)
      accountType,
      accountDetails,
      provider,
      isCustodianSupportedChain,
      ///: END:ONLY_INCLUDE_IN
    } = this.props;

    const checksummedAddress = toChecksumHexAddress(selectedIdentity.address);

    let title = this.state.copied
      ? t('copiedExclamation')
      : t('copyToClipboard');

    let showAccountCopyIcon = true;

    ///: BEGIN:ONLY_INCLUDE_IN(build-mmi)
    const custodyLabels = accountDetails
      ? accountDetails[toChecksumHexAddress(selectedIdentity.address)]?.labels
      : {};
    const showCustodyLabels =
      getEnvironmentType() !== ENVIRONMENT_TYPE_POPUP &&
      accountType === 'custody' &&
      custodyLabels;

    const tooltipText = this.state.copied
      ? t('copiedExclamation')
      : t('copyToClipboard');

    title = isCustodianSupportedChain
      ? tooltipText
      : t('custodyWrongChain', [provider.nickname || provider.type]);

    showAccountCopyIcon = isCustodianSupportedChain;
    ///: END:ONLY_INCLUDE_IN

    return (
      <div className="selected-account">
        <Tooltip
          wrapperClassName="selected-account__tooltip-wrapper"
          position="bottom"
          title={title}
        >
          <button
            className="selected-account__clickable"
            data-testid="selected-account-click"
            ///: BEGIN:ONLY_INCLUDE_IN(build-mmi)
            disabled={!isCustodianSupportedChain}
            ///: END:ONLY_INCLUDE_IN
            onClick={() => {
              this.setState({ copied: true });
              this.copyTimeout = setTimeout(
                () => this.setState({ copied: false }),
                SECOND * 3,
              );
              copyToClipboard(checksummedAddress);
            }}
          >
            <div className="selected-account__name">
              {selectedIdentity.name}
            </div>
            <div className="selected-account__address">
              {
                ///: BEGIN:ONLY_INCLUDE_IN(build-mmi)
                showCustodyLabels && <CustodyLabels labels={custodyLabels} />
                ///: END:ONLY_INCLUDE_IN
              }
              {shortenAddress(checksummedAddress)}
              {showAccountCopyIcon && (
                <div className="selected-account__copy">
                  <Icon
                    name={
                      this.state.copied ? IconName.CopySuccess : IconName.Copy
                    }
                    size={IconSize.Sm}
                    color={IconColor.iconAlternative}
                  />
                </div>
              )}
            </div>
          </button>
        </Tooltip>
      </div>
    );
  }
}

export default SelectedAccount;
