import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import {
  activeTabHasPermissions,
  getCurrentEthBalance,
  getFirstPermissionRequest,
  getIsMainnet,
  getOriginOfCurrentTab,
  getTotalUnapprovedCount,
  getUnapprovedTemplatedConfirmations,
  getWeb3ShimUsageStateForOrigin,
  unconfirmedTransactionsCountSelector,
  getInfuraBlocked,
  getShowWhatsNewPopup,
  getSortedAnnouncementsToShow,
  getShowRecoveryPhraseReminder,
  getNewNetworkAdded,
  hasUnsignedQRHardwareTransaction,
  hasUnsignedQRHardwareMessage,
  getNewCollectibleAddedMessage,
} from '../../selectors';

import {
  closeNotificationPopup,
  setConnectedStatusPopoverHasBeenShown,
  setDefaultHomeActiveTabName,
  setWeb3ShimUsageAlertDismissed,
  setAlertEnabledness,
  setRecoveryPhraseReminderHasBeenShown,
  setRecoveryPhraseReminderLastShown,
  setNewNetworkAdded,
  setNewCollectibleAddedMessage,
  ///: BEGIN:ONLY_INCLUDE_IN(flask)
  removeSnapError,
  ///: END:ONLY_INCLUDE_IN
} from '../../store/actions';
import { hideWhatsNewPopup } from '../../ducks/app/app';
import { getWeb3ShimUsageAlertEnabledness } from '../../ducks/metamask/metamask';
import { getSwapsFeatureIsLive } from '../../ducks/swaps/swaps';
import { getEnvironmentType } from '../../../app/scripts/lib/util';
import {
  ENVIRONMENT_TYPE_NOTIFICATION,
  ENVIRONMENT_TYPE_POPUP,
} from '../../../shared/constants/app';
import {
  ALERT_TYPES,
  WEB3_SHIM_USAGE_ALERT_STATES,
} from '../../../shared/constants/alerts';
import Home from './home.component';

const mapStateToProps = (state) => {
  const { metamask, appState } = state;
  const {
    suggestedAssets,
    seedPhraseBackedUp,
    tokens,
    selectedAddress,
    connectedStatusPopoverHasBeenShown,
    defaultHomeActiveTabName,
    swapsState,
    dismissSeedBackUpReminder,
    firstTimeFlowType,
    completedOnboarding,
  } = metamask;
  const accountBalance = getCurrentEthBalance(state);
  const { forgottenPassword } = appState;
  const totalUnapprovedCount = getTotalUnapprovedCount(state);
  const swapsEnabled = getSwapsFeatureIsLive(state);
  const pendingConfirmations = getUnapprovedTemplatedConfirmations(state);

  const envType = getEnvironmentType();
  const isPopup = envType === ENVIRONMENT_TYPE_POPUP;
  const isNotification = envType === ENVIRONMENT_TYPE_NOTIFICATION;

  const firstPermissionsRequest = getFirstPermissionRequest(state);
  const firstPermissionsRequestId =
    firstPermissionsRequest?.metadata.id || null;

  const originOfCurrentTab = getOriginOfCurrentTab(state);
  const shouldShowWeb3ShimUsageNotification =
    isPopup &&
    getWeb3ShimUsageAlertEnabledness(state) &&
    activeTabHasPermissions(state) &&
    getWeb3ShimUsageStateForOrigin(state, originOfCurrentTab) ===
      WEB3_SHIM_USAGE_ALERT_STATES.RECORDED;

  const isSigningQRHardwareTransaction =
    hasUnsignedQRHardwareTransaction(state) ||
    hasUnsignedQRHardwareMessage(state);

  return {
    forgottenPassword,
    suggestedAssets,
    swapsEnabled,
    unconfirmedTransactionsCount: unconfirmedTransactionsCountSelector(state),
    shouldShowSeedPhraseReminder:
      seedPhraseBackedUp === false &&
      (parseInt(accountBalance, 16) > 0 || tokens.length > 0) &&
      dismissSeedBackUpReminder === false,
    isPopup,
    isNotification,
    selectedAddress,
    firstPermissionsRequestId,
    totalUnapprovedCount,
    connectedStatusPopoverHasBeenShown,
    defaultHomeActiveTabName,
    firstTimeFlowType,
    completedOnboarding,
    haveSwapsQuotes: Boolean(Object.values(swapsState.quotes || {}).length),
    swapsFetchParams: swapsState.fetchParams,
    showAwaitingSwapScreen: swapsState.routeState === 'awaiting',
    isMainnet: getIsMainnet(state),
    originOfCurrentTab,
    shouldShowWeb3ShimUsageNotification,
    pendingConfirmations,
    infuraBlocked: getInfuraBlocked(state),
    notificationsToShow: getSortedAnnouncementsToShow(state).length > 0,
    ///: BEGIN:ONLY_INCLUDE_IN(flask)
    errorsToShow: metamask.snapErrors,
    shouldShowErrors: Object.entries(metamask.snapErrors || []).length > 0,
    ///: END:ONLY_INCLUDE_IN
    showWhatsNewPopup: getShowWhatsNewPopup(state),
    showRecoveryPhraseReminder: getShowRecoveryPhraseReminder(state),
    seedPhraseBackedUp,
    newNetworkAdded: getNewNetworkAdded(state),
    isSigningQRHardwareTransaction,
    newCollectibleAddedMessage: getNewCollectibleAddedMessage(state),
  };
};

const mapDispatchToProps = (dispatch) => ({
  closeNotificationPopup: () => closeNotificationPopup(),
  ///: BEGIN:ONLY_INCLUDE_IN(flask)
  removeSnapError: async (id) => await removeSnapError(id),
  ///: END:ONLY_INCLUDE_IN
  setConnectedStatusPopoverHasBeenShown: () =>
    dispatch(setConnectedStatusPopoverHasBeenShown()),
  onTabClick: (name) => dispatch(setDefaultHomeActiveTabName(name)),
  setWeb3ShimUsageAlertDismissed: (origin) =>
    setWeb3ShimUsageAlertDismissed(origin),
  disableWeb3ShimUsageAlert: () =>
    setAlertEnabledness(ALERT_TYPES.web3ShimUsage, false),
  hideWhatsNewPopup: () => dispatch(hideWhatsNewPopup()),
  setRecoveryPhraseReminderHasBeenShown: () =>
    dispatch(setRecoveryPhraseReminderHasBeenShown()),
  setRecoveryPhraseReminderLastShown: (lastShown) =>
    dispatch(setRecoveryPhraseReminderLastShown(lastShown)),
  setNewNetworkAdded: (newNetwork) => {
    dispatch(setNewNetworkAdded(newNetwork));
  },
  setNewCollectibleAddedMessage: (message) => {
    dispatch(setNewCollectibleAddedMessage(message));
  },
});

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
)(Home);
