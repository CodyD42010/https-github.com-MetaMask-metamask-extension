import ethUtil from 'ethereumjs-util';
import contractMap from '@metamask/contract-metadata';
import {
  REQUIRED_ERROR,
  INVALID_RECIPIENT_ADDRESS_ERROR,
  KNOWN_RECIPIENT_ADDRESS_ERROR,
  INVALID_RECIPIENT_ADDRESS_NOT_ETH_NETWORK_ERROR,
} from '../../send.constants';

import {
  isValidAddress,
  isEthNetwork,
  checkExistingAddresses,
} from '../../../../helpers/utils/util';

export function getToErrorObject(to, network) {
  let toError = null;
  if (!to) {
    toError = REQUIRED_ERROR;
  } else if (!isValidAddress(to)) {
    toError = isEthNetwork(network)
      ? INVALID_RECIPIENT_ADDRESS_ERROR
      : INVALID_RECIPIENT_ADDRESS_NOT_ETH_NETWORK_ERROR;
  }

  return { to: toError };
}

export function getToWarningObject(to, tokens = [], sendToken = null) {
  let toWarning = null;
  if (
    sendToken &&
    (ethUtil.toChecksumAddress(to) in contractMap ||
      checkExistingAddresses(to, tokens))
  ) {
    toWarning = KNOWN_RECIPIENT_ADDRESS_ERROR;
  }
  return { to: toWarning };
}
