import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import { DEFAULT_AUTO_LOCK_TIME_LIMIT } from '../../../../shared/constants/preferences';
import { getPreferences, getIsStxOptInAvailable } from '../../../selectors';
import {
  backupUserData,
  displayWarning,
  restoreUserData,
  setAutoLockTimeLimit,
  setDisabledRpcMethodPreference,
  setDismissSeedBackUpReminder,
  setFeatureFlag,
  setShowExtensionInFullSizeView,
  setShowFiatConversionOnTestnetsPreference,
  setShowTestNetworks,
  setStxOptIn,
  setUseNonceField,
  showModal,
} from '../../../store/actions';
import AdvancedTab from './advanced-tab.component';

export const mapStateToProps = (state) => {
  const {
    appState: { warning },
    metamask,
  } = state;
  const {
    featureFlags: { sendHexData } = {},
    disabledRpcMethodPreferences,
    useNonceField,
    dismissSeedBackUpReminder,
  } = metamask;
  const {
    showFiatInTestnets,
    showTestNetworks,
    showExtensionInFullSizeView,
    stxOptIn,
    autoLockTimeLimit = DEFAULT_AUTO_LOCK_TIME_LIMIT,
  } = getPreferences(state);
  const isStxOptInAvailable = getIsStxOptInAvailable(state);

  return {
    warning,
    sendHexData,
    showFiatInTestnets,
    showTestNetworks,
    showExtensionInFullSizeView,
    stxOptIn,
    autoLockTimeLimit,
    useNonceField,
    dismissSeedBackUpReminder,
    disabledRpcMethodPreferences,
    isStxOptInAvailable,
  };
};

export const mapDispatchToProps = (dispatch) => {
  return {
    backupUserData: () => backupUserData(),
    restoreUserData: (jsonString) => restoreUserData(jsonString),
    setHexDataFeatureFlag: (shouldShow) =>
      dispatch(setFeatureFlag('sendHexData', shouldShow)),
    displayWarning: (warning) => dispatch(displayWarning(warning)),
    showResetAccountConfirmationModal: () =>
      dispatch(showModal({ name: 'CONFIRM_RESET_ACCOUNT' })),
    showEthSignModal: () => dispatch(showModal({ name: 'ETH_SIGN' })),
    setUseNonceField: (value) => dispatch(setUseNonceField(value)),
    setShowFiatConversionOnTestnetsPreference: (value) => {
      return dispatch(setShowFiatConversionOnTestnetsPreference(value));
    },
    setShowTestNetworks: (value) => {
      return dispatch(setShowTestNetworks(value));
    },
    setShowExtensionInFullSizeView: (value) => {
      return dispatch(setShowExtensionInFullSizeView(value));
    },
    setStxOptIn: (value) => {
      return dispatch(setStxOptIn(value));
    },
    setAutoLockTimeLimit: (value) => {
      return dispatch(setAutoLockTimeLimit(value));
    },
    setDismissSeedBackUpReminder: (value) => {
      return dispatch(setDismissSeedBackUpReminder(value));
    },
    setDisabledRpcMethodPreference: (methodName, isEnabled) => {
      return dispatch(setDisabledRpcMethodPreference(methodName, isEnabled));
    },
  };
};

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
)(AdvancedTab);
