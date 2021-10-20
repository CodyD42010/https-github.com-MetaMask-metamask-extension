import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { getEnvironmentType } from '../../../../app/scripts/lib/util';
import Identicon from '../../ui/identicon';
import LedgerInstructionField from '../ledger-instruction-field';
import { CONNECT_HARDWARE_ROUTE } from '../../../helpers/constants/routes';
import Header from './signature-request-header';
import Footer from './signature-request-footer';
import Message from './signature-request-message';
import { ENVIRONMENT_TYPE_NOTIFICATION } from './signature-request.constants';

export default class SignatureRequest extends PureComponent {
  static propTypes = {
    txData: PropTypes.object.isRequired,
    fromAccount: PropTypes.shape({
      address: PropTypes.string.isRequired,
      balance: PropTypes.string,
      name: PropTypes.string,
      isLedgerWallet: PropTypes.bool,
    }).isRequired,
    isLedgerWallet: PropTypes.bool,
    clearConfirmTransaction: PropTypes.func.isRequired,
    cancel: PropTypes.func.isRequired,
    sign: PropTypes.func.isRequired,
    hardwareWalletRequiresConnection: PropTypes.func.isRequired,
  };

  static contextTypes = {
    t: PropTypes.func,
    metricsEvent: PropTypes.func,
  };

  componentDidMount() {
    if (getEnvironmentType() === ENVIRONMENT_TYPE_NOTIFICATION) {
      window.addEventListener('beforeunload', this._beforeUnload);
    }
  }

  _beforeUnload = (event) => {
    const {
      clearConfirmTransaction,
      cancel,
      txData: { type },
    } = this.props;
    const { metricsEvent } = this.context;
    metricsEvent({
      eventOpts: {
        category: 'Transactions',
        action: 'Sign Request',
        name: 'Cancel Sig Request Via Notification Close',
      },
      customVariables: {
        type,
      },
    });
    clearConfirmTransaction();
    cancel(event);
  };

  formatWallet(wallet) {
    return `${wallet.slice(0, 8)}...${wallet.slice(
      wallet.length - 8,
      wallet.length,
    )}`;
  }

  render() {
    const {
      fromAccount,
      txData: {
        msgParams: { data, origin, version },
        type,
      },
      cancel,
      sign,
      isLedgerWallet,
      hardwareWalletRequiresConnection,
    } = this.props;
    const { address: fromAddress } = fromAccount;
    const { message, domain = {} } = JSON.parse(data);
    const { metricsEvent } = this.context;

    const onSign = (event) => {
      window.removeEventListener('beforeunload', this._beforeUnload);
      sign(event);
      metricsEvent({
        eventOpts: {
          category: 'Transactions',
          action: 'Sign Request',
          name: 'Confirm',
        },
        customVariables: {
          type,
          version,
        },
      });
    };

    const onCancel = (event) => {
      window.removeEventListener('beforeunload', this._beforeUnload);
      cancel(event);
      metricsEvent({
        eventOpts: {
          category: 'Transactions',
          action: 'Sign Request',
          name: 'Cancel',
        },
        customVariables: {
          type,
          version,
        },
      });
    };

    return (
      <div className="signature-request page-container">
        <Header fromAccount={fromAccount} />
        <div className="signature-request-content">
          <div className="signature-request-content__title">
            {this.context.t('sigRequest')}
          </div>
          <div className="signature-request-content__identicon-container">
            <div className="signature-request-content__identicon-initial">
              {domain.name && domain.name[0]}
            </div>
            <div className="signature-request-content__identicon-border" />
            <Identicon address={fromAddress} diameter={70} />
          </div>
          <div className="signature-request-content__info--bolded">
            {domain.name}
          </div>
          <div className="signature-request-content__info">{origin}</div>
          <div className="signature-request-content__info">
            {this.formatWallet(fromAddress)}
          </div>
        </div>
        {isLedgerWallet ? (
          <div className="confirm-approve-content__ledger-instruction-wrapper">
            <LedgerInstructionField
              showDataInstruction
              fullscreenUrl={CONNECT_HARDWARE_ROUTE}
            />
          </div>
        ) : null}
        <Message data={message} />
        <Footer
          cancelAction={onCancel}
          signAction={onSign}
          disabled={hardwareWalletRequiresConnection}
        />
      </div>
    );
  }
}
