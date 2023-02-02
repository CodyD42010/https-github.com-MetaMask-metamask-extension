import React, { Component } from 'react';
import PropTypes from 'prop-types';
import copyToClipboard from 'copy-to-clipboard';
import { shortenAddress } from '../../../helpers/utils/util';

import Tooltip from '../../ui/tooltip';
import { toChecksumHexAddress } from '../../../../shared/modules/hexstring-utils';
import { SECOND } from '../../../../shared/constants/time';
import { Icon, ICON_NAMES, ICON_SIZES } from '../../component-library';
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
    const { selectedIdentity } = this.props;
    const checksummedAddress = toChecksumHexAddress(selectedIdentity.address);

    return (
      <div className="selected-account">
        <Tooltip
          wrapperClassName="selected-account__tooltip-wrapper"
          position="bottom"
          title={
            this.state.copied ? t('copiedExclamation') : t('copyToClipboard')
          }
        >
          <button
            className="selected-account__clickable"
            data-testid="selected-account-click"
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
              {shortenAddress(checksummedAddress)}
              <div className="selected-account__copy">
                <Icon
                  name={
                    this.state.copied
                      ? ICON_NAMES.COPY_SUCCESS
                      : ICON_NAMES.COPY
                  }
                  size={ICON_SIZES.SM}
                  color={IconColor.iconAlternative}
                />
              </div>
            </div>
          </button>
        </Tooltip>
      </div>
    );
  }
}

export default SelectedAccount;
