import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { Switch, Route, useHistory } from 'react-router-dom';
import {
  CONFIRM_APPROVE_PATH,
  CONFIRM_INCREASE_ALLOWANCE_PATH,
  CONFIRM_SAFE_TRANSFER_FROM_PATH,
  CONFIRM_SEND_TOKEN_PATH,
  CONFIRM_SET_APPROVAL_FOR_ALL_PATH,
  CONFIRM_TRANSACTION_ROUTE,
  CONFIRM_TRANSFER_FROM_PATH,
  SEND_ROUTE,
} from '../../../helpers/constants/routes';
import { transactionFeeSelector } from '../../../selectors';
import ConfirmApprove from '../confirm-approve';
import ConfirmSendToken from '../confirm-send-token';
import ConfirmTokenTransactionBase from '../confirm-token-transaction-base';
import ConfirmTransactionSwitch from '../confirm-transaction-switch';
import { editExistingTransaction } from '../../../ducks/send';
import { AssetType } from '../../../../shared/constants/transaction';
import { clearConfirmTransaction } from '../../../ducks/confirm-transaction/confirm-transaction.duck';
import {
  sumHexes,
} from '../../../../shared/modules/conversion.utils';
import { useAssetDetails } from '../hooks/useAssetDetails';
import { useGasFeeContext } from '../../../contexts/gasFee';

function applyMultilayerFees(transactionFees, multiLayerFees = '0x0') {
  const {
    ethTransactionTotal,
    fiatTransactionTotal,
    hexTransactionTotal,
    hexMaximumTransactionFee,
    hexMinimumTransactionFee,
  } = transactionFees;

  return {
    ethTransactionTotal: sumHexes(ethTransactionTotal, multiLayerFees),
    fiatTransactionTotal: sumHexes(fiatTransactionTotal, multiLayerFees),
    hexTransactionTotal: sumHexes(hexTransactionTotal, multiLayerFees),
    hexMaximumTransactionFee: sumHexes(hexMaximumTransactionFee, multiLayerFees),
    hexMinimumTransactionFee: sumHexes(hexMinimumTransactionFee, multiLayerFees),
  }
}

export default function ConfirmTokenTransactionSwitch({ transaction }) {
  const { txParams: { data, to: tokenAddress, from: userAddress } = {} } =
    transaction;

  const dispatch = useDispatch();
  const history = useHistory();

  const {
    estimatedL1Fees,
  } = useGasFeeContext();

  const {
    assetStandard,
    assetName,
    userBalance,
    tokenSymbol,
    decimals,
    tokenImage,
    tokenAmount,
    tokenId,
    toAddress,
  } = useAssetDetails(tokenAddress, userAddress, data);

  const {
    ethTransactionTotal,
    fiatTransactionTotal,
    ...otherTransactionFees
  } = useSelector((state) => transactionFeeSelector(state, transaction));

  const {
    hexTransactionTotal,
    hexMaximumTransactionFee,
    hexMinimumTransactionFee,
  } = applyMultilayerFees(otherTransactionFees, estimatedL1Fees);

  return (
    <Switch>
      <Route
        exact
        path={`${CONFIRM_TRANSACTION_ROUTE}/:id?${CONFIRM_APPROVE_PATH}`}
        render={() => (
          <ConfirmApprove
            assetStandard={assetStandard}
            assetName={assetName}
            userBalance={userBalance}
            tokenSymbol={tokenSymbol}
            decimals={decimals}
            tokenImage={tokenImage}
            tokenAmount={tokenAmount}
            tokenId={tokenId}
            userAddress={userAddress}
            tokenAddress={tokenAddress}
            toAddress={toAddress}
            transaction={transaction}
            ethTransactionTotal={ethTransactionTotal}
            fiatTransactionTotal={fiatTransactionTotal}
            hexTransactionTotal={hexTransactionTotal}
            hexMinimumTransactionFee={hexMinimumTransactionFee}
          />
        )}
      />
      <Route
        exact
        path={`${CONFIRM_TRANSACTION_ROUTE}/:id?${CONFIRM_SET_APPROVAL_FOR_ALL_PATH}`}
        render={() => (
          <ConfirmApprove
            isSetApproveForAll
            assetStandard={assetStandard}
            assetName={assetName}
            userBalance={userBalance}
            tokenSymbol={tokenSymbol}
            decimals={decimals}
            tokenImage={tokenImage}
            tokenAmount={tokenAmount}
            tokenId={tokenId}
            userAddress={userAddress}
            tokenAddress={tokenAddress}
            toAddress={toAddress}
            transaction={transaction}
            ethTransactionTotal={ethTransactionTotal}
            fiatTransactionTotal={fiatTransactionTotal}
            hexTransactionTotal={hexTransactionTotal}
            hexMinimumTransactionFee={hexMinimumTransactionFee}
          />
        )}
      />
      <Route
        exact
        path={`${CONFIRM_TRANSACTION_ROUTE}/:id?${CONFIRM_TRANSFER_FROM_PATH}`}
        render={() => (
          <ConfirmTokenTransactionBase
            assetStandard={assetStandard}
            assetName={assetName}
            userBalance={userBalance}
            tokenSymbol={tokenSymbol}
            decimals={decimals}
            image={tokenImage}
            tokenAddress={tokenAddress}
            onEdit={async ({ txData }) => {
              const { id } = txData;
              await dispatch(
                editExistingTransaction(AssetType.NFT, id.toString()),
              );
              dispatch(clearConfirmTransaction());
              history.push(SEND_ROUTE);
            }}
            toAddress={toAddress}
            tokenAmount={tokenAmount}
            tokenId={tokenId}
            userAddress={userAddress}
            transaction={transaction}
            ethTransactionTotal={ethTransactionTotal}
            fiatTransactionTotal={fiatTransactionTotal}
            hexMaximumTransactionFee={hexMaximumTransactionFee}
          />
        )}
      />
      <Route
        exact
        path={`${CONFIRM_TRANSACTION_ROUTE}/:id?${CONFIRM_SAFE_TRANSFER_FROM_PATH}`}
        render={() => (
          <ConfirmTokenTransactionBase
            assetStandard={assetStandard}
            assetName={assetName}
            userBalance={userBalance}
            tokenSymbol={tokenSymbol}
            decimals={decimals}
            image={tokenImage}
            tokenAddress={tokenAddress}
            onEdit={async ({ txData }) => {
              const { id } = txData;
              await dispatch(
                editExistingTransaction(AssetType.NFT, id.toString()),
              );
              dispatch(clearConfirmTransaction());
              history.push(SEND_ROUTE);
            }}
            toAddress={toAddress}
            tokenAmount={tokenAmount}
            tokenId={tokenId}
            userAddress={userAddress}
            transaction={transaction}
            ethTransactionTotal={ethTransactionTotal}
            fiatTransactionTotal={fiatTransactionTotal}
            hexMaximumTransactionFee={hexMaximumTransactionFee}
          />
        )}
      />
      <Route
        exact
        path={`${CONFIRM_TRANSACTION_ROUTE}/:id?${CONFIRM_SEND_TOKEN_PATH}`}
        render={() => (
          <ConfirmSendToken
            assetStandard={assetStandard}
            assetName={assetName}
            tokenSymbol={tokenSymbol}
            image={tokenImage}
            tokenAddress={tokenAddress}
            toAddress={toAddress}
            tokenAmount={tokenAmount}
            tokenId={tokenId}
            transaction={transaction}
            ethTransactionTotal={ethTransactionTotal}
            fiatTransactionTotal={fiatTransactionTotal}
            hexMaximumTransactionFee={hexMaximumTransactionFee}
          />
        )}
      />
      <Route
        exact
        path={`${CONFIRM_TRANSACTION_ROUTE}/:id?${CONFIRM_INCREASE_ALLOWANCE_PATH}`}
        render={() => (
          <ConfirmApprove
            assetStandard={assetStandard}
            assetName={assetName}
            userBalance={userBalance}
            tokenSymbol={tokenSymbol}
            decimals={decimals}
            tokenImage={tokenImage}
            tokenAmount={tokenAmount}
            tokenId={tokenId}
            userAddress={userAddress}
            tokenAddress={tokenAddress}
            toAddress={toAddress}
            transaction={transaction}
            ethTransactionTotal={ethTransactionTotal}
            fiatTransactionTotal={fiatTransactionTotal}
            hexTransactionTotal={hexTransactionTotal}
            hexMinimumTransactionFee={hexMinimumTransactionFee}
          />
        )}
      />
      <Route path="*" component={ConfirmTransactionSwitch} />
    </Switch>
  );
}

ConfirmTokenTransactionSwitch.propTypes = {
  transaction: PropTypes.shape({
    origin: PropTypes.string,
    txParams: PropTypes.shape({
      data: PropTypes.string,
      to: PropTypes.string,
      from: PropTypes.string,
    }),
  }),
};
