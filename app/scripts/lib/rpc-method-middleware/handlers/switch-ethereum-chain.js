import { ethErrors } from 'eth-rpc-errors';
import { omit } from 'lodash';
import { ApprovalType } from '@metamask/controller-utils';
import { MESSAGE_TYPE } from '../../../../../shared/constants/app';
import {
  CHAIN_ID_TO_TYPE_MAP,
  NETWORK_TO_NAME_MAP,
  CHAIN_ID_TO_RPC_URL_MAP,
  CURRENCY_SYMBOLS,
  BUILT_IN_INFURA_NETWORKS,
} from '../../../../../shared/constants/network';
import {
  isPrefixedFormattedHexString,
  isSafeChainId,
} from '../../../../../shared/modules/network.utils';

const switchEthereumChain = {
  methodNames: [MESSAGE_TYPE.SWITCH_ETHEREUM_CHAIN],
  implementation: switchEthereumChainHandler,
  hookNames: {
    getCurrentChainId: true,
    findNetworkConfigurationBy: true,
    setProviderType: true,
    setActiveNetwork: true,
    requestUserApproval: true,
  },
};
export default switchEthereumChain;

function findExistingNetwork(chainId, findNetworkConfigurationBy) {
  if (
    Object.values(BUILT_IN_INFURA_NETWORKS)
      .map(({ chainId: id }) => id)
      .includes(chainId)
  ) {
    return {
      chainId,
      ticker: CURRENCY_SYMBOLS.ETH,
      nickname: NETWORK_TO_NAME_MAP[chainId],
      rpcUrl: CHAIN_ID_TO_RPC_URL_MAP[chainId],
      type: CHAIN_ID_TO_TYPE_MAP[chainId],
    };
  }

  return findNetworkConfigurationBy({ chainId });
}

async function switchEthereumChainHandler(
  req,
  res,
  _next,
  end,
  {
    getCurrentChainId,
    findNetworkConfigurationBy,
    setProviderType,
    setActiveNetwork,
    requestUserApproval,
  },
) {
  if (!req.params?.[0] || typeof req.params[0] !== 'object') {
    return end(
      ethErrors.rpc.invalidParams({
        message: `Expected single, object parameter. Received:\n${JSON.stringify(
          req.params,
        )}`,
      }),
    );
  }

  const { origin } = req;

  const { chainId } = req.params[0];

  const otherKeys = Object.keys(omit(req.params[0], ['chainId']));

  if (otherKeys.length > 0) {
    return end(
      ethErrors.rpc.invalidParams({
        message: `Received unexpected keys on object parameter. Unsupported keys:\n${otherKeys}`,
      }),
    );
  }

  const _chainId = typeof chainId === 'string' && chainId.toLowerCase();

  if (!isPrefixedFormattedHexString(_chainId)) {
    return end(
      ethErrors.rpc.invalidParams({
        message: `Expected 0x-prefixed, unpadded, non-zero hexadecimal string 'chainId'. Received:\n${chainId}`,
      }),
    );
  }

  if (!isSafeChainId(parseInt(_chainId, 16))) {
    return end(
      ethErrors.rpc.invalidParams({
        message: `Invalid chain ID "${_chainId}": numerical value greater than max safe value. Received:\n${chainId}`,
      }),
    );
  }

  const requestData = findExistingNetwork(_chainId, findNetworkConfigurationBy);
  if (requestData) {
    const currentChainId = getCurrentChainId();
    if (currentChainId === _chainId) {
      res.result = null;
      return end();
    }
    try {
      const approvedRequestData = await requestUserApproval({
        origin,
        type: ApprovalType.SwitchEthereumChain,
        requestData,
      });
      if (
        Object.values(BUILT_IN_INFURA_NETWORKS)
          .map(({ chainId: id }) => id)
          .includes(chainId)
      ) {
        await setProviderType(approvedRequestData.type);
      } else {
        await setActiveNetwork(approvedRequestData.id);
      }
      res.result = null;
    } catch (error) {
      return end(error);
    }
    return end();
  }
  return end(
    ethErrors.provider.custom({
      code: 4902, // To-be-standardized "unrecognized chain ID" error
      message: `Unrecognized chain ID "${chainId}". Try adding the chain using ${MESSAGE_TYPE.ADD_ETHEREUM_CHAIN} first.`,
    }),
  );
}
