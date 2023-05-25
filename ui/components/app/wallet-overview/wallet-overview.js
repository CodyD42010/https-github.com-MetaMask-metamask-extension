import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { useSelector } from 'react-redux';
import { toChecksumHexAddress } from '../../../../shared/modules/hexstring-utils';
import { getSelectedIdentity } from '../../../selectors';
import { AddressCopyButton } from '../../multichain';
import Box from '../../ui/box/box';

const WalletOverview = ({ balance, buttons, className }) => {
  const selectedIdentity = useSelector(getSelectedIdentity);
  const checksummedAddress = toChecksumHexAddress(selectedIdentity?.address);
  return (
    <div className={classnames('wallet-overview', className)}>
      <div className="wallet-overview__balance">
        <Box marginTop={2}>
          <AddressCopyButton address={checksummedAddress} shorten />
        </Box>
        {balance}
      </div>
      <div className="wallet-overview__buttons">{buttons}</div>
    </div>
  );
};

WalletOverview.propTypes = {
  balance: PropTypes.element.isRequired,
  buttons: PropTypes.element.isRequired,
  className: PropTypes.string,
};

WalletOverview.defaultProps = {
  className: undefined,
};

export default WalletOverview;
