import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { showCustodianDeepLink } from '@metamask-institutional/extension';
import {
  showCustodyConfirmLink,
  checkForUnapprovedMessages,
} from '../store/institutional/institution-actions';
import {
  mmiActionsFactory,
  setTypedMessageInProgress,
} from '../store/institutional/institution-background';
import {
  accountsWithSendEtherInfoSelector,
  getAccountType,
  unapprovedTypedMessagesSelector,
} from '../selectors';
import { getAccountByAddress } from '../helpers/utils/util';
import { getEnvironmentType } from '../../app/scripts/lib/util';
import { goHome, showModal } from '../store/actions';
import { ENVIRONMENT_TYPE_NOTIFICATION } from '../../shared/constants/app';

export function useMMICustodySignMessage() {
  const dispatch = useDispatch();
  const mmiActions = mmiActionsFactory();
  const envType = getEnvironmentType();
  const accountType = useSelector(getAccountType);
  const isNotification = envType === ENVIRONMENT_TYPE_NOTIFICATION;
  const allAccounts = useSelector(
    accountsWithSendEtherInfoSelector,
    shallowEqual,
  );
  const unapprovedTypedMessages = useSelector(unapprovedTypedMessagesSelector);

  const custodySignFn = async (_msgData) => {
    if (accountType === 'custody') {
      const { address: fromAddress } =
        getAccountByAddress(allAccounts, _msgData.msgParams.from) || {};
      try {
        let msgData = _msgData;
        let id = _msgData.custodyId;
        if (!_msgData.custodyId) {
          msgData = checkForUnapprovedMessages(
            _msgData,
            unapprovedTypedMessages,
          );
          id = msgData.custodyId;
        }
        showCustodianDeepLink({
          dispatch,
          mmiActions,
          txId: undefined,
          custodyId: id,
          fromAddress,
          isSignature: true,
          closeNotification: isNotification,
          onDeepLinkFetched: () => undefined,
          onDeepLinkShown: () => undefined,
          showCustodyConfirmLink,
        });
        await dispatch(setTypedMessageInProgress(msgData.metamaskId));
        await dispatch(mmiActions.setWaitForConfirmDeepLinkDialog(true));
        await dispatch(goHome());
      } catch (err) {
        await dispatch(mmiActions.setWaitForConfirmDeepLinkDialog(true));
        await dispatch(
          showModal({
            name: 'TRANSACTION_FAILED',
            errorMessage: err.message,
            closeNotification: true,
            operationFailed: true,
          }),
        );
      }
    }
  };

  return { custodySignFn };
}
