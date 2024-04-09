import { ethErrors } from 'eth-rpc-errors';
import { omit } from 'lodash';
import { ApprovalType, InfuraNetworkType } from '@metamask/controller-utils';
import {
  JsonRpcParams,
  JsonRpcRequest,
  PendingJsonRpcResponse,
} from '@metamask/utils';
import {
  JsonRpcEngineEndCallback,
  JsonRpcEngineNextCallback,
} from '@metamask/json-rpc-engine';
import { ProviderConfig } from '@metamask/network-controller';
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
import {
  ExistingNetworkChainIds,
  FindNetworkClientIdByChainId,
  FindNetworkConfigurationBy,
  GetCurrentChainId,
  GetNetworkConfigurations,
  GetProviderConfig,
  HandlerWrapper,
  HasPermission,
  RequestUserApproval,
  SetActiveNetwork,
  SetNetworkClientIdForDomain,
  SetProviderType,
} from './handlers-helper';

type SwitchEthereumChainOptions = {
  getCurrentChainId: GetCurrentChainId;
  findNetworkConfigurationBy: FindNetworkConfigurationBy;
  findNetworkClientIdByChainId: FindNetworkClientIdByChainId;
  setNetworkClientIdForDomain: SetNetworkClientIdForDomain;
  setProviderType: SetProviderType;
  setActiveNetwork: SetActiveNetwork;
  requestUserApproval: RequestUserApproval;
  getNetworkConfigurations: GetNetworkConfigurations;
  getProviderConfig: GetProviderConfig;
  hasPermissions: HasPermission;
};

type SwitchEthereumChainConstraints<
  Params extends JsonRpcParams = JsonRpcParams,
> = {
  implementation: (
    _req: JsonRpcRequest<Params>,
    res: PendingJsonRpcResponse<null>,
    _next: JsonRpcEngineNextCallback,
    end: JsonRpcEngineEndCallback,
    {
      getCurrentChainId,
      findNetworkConfigurationBy,
      findNetworkClientIdByChainId,
      setNetworkClientIdForDomain,
      setProviderType,
      setActiveNetwork,
      requestUserApproval,
      getProviderConfig,
      hasPermissions,
    }: SwitchEthereumChainOptions,
  ) => Promise<void>;
} & HandlerWrapper;

const switchEthereumChain = {
  methodNames: [MESSAGE_TYPE.SWITCH_ETHEREUM_CHAIN],
  implementation: switchEthereumChainHandler,
  hookNames: {
    getCurrentChainId: true,
    findNetworkConfigurationBy: true,
    findNetworkClientIdByChainId: true,
    setNetworkClientIdForDomain: true,
    setProviderType: true,
    setActiveNetwork: true,
    requestUserApproval: true,
    getNetworkConfigurations: true,
    getProviderConfig: true,
    hasPermissions: true,
  },
} satisfies SwitchEthereumChainConstraints;

export default switchEthereumChain;

function findExistingNetwork(
  chainId: ExistingNetworkChainIds,
  findNetworkConfigurationBy: FindNetworkConfigurationBy,
) {
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

async function switchEthereumChainHandler<
  Params extends JsonRpcParams = JsonRpcParams,
>(
  req: JsonRpcRequest<Params>,
  res: PendingJsonRpcResponse<null>,
  _next: JsonRpcEngineNextCallback,
  end: JsonRpcEngineEndCallback,
  {
    getCurrentChainId,
    findNetworkConfigurationBy,
    findNetworkClientIdByChainId,
    setNetworkClientIdForDomain,
    setProviderType,
    setActiveNetwork,
    requestUserApproval,
    getProviderConfig,
    hasPermissions,
  }: SwitchEthereumChainOptions,
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

  const _chainId = (typeof chainId === 'string' &&
    chainId.toLowerCase()) as ExistingNetworkChainIds;

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

  const requestData: Record<string, ProviderConfig | null> = {
    toNetworkConfiguration: findExistingNetwork(
      _chainId,
      findNetworkConfigurationBy,
    ),
  };

  requestData.fromNetworkConfiguration = getProviderConfig();

  if (requestData.toNetworkConfiguration) {
    const currentChainId = getCurrentChainId();

    // we might want to change all this so that it displays the network you are switching from -> to (in a way that is domain - specific)

    const networkClientId = findNetworkClientIdByChainId(_chainId);

    if (currentChainId === _chainId) {
      if (hasPermissions(req.origin)) {
        setNetworkClientIdForDomain(req.origin, networkClientId);
      }
      res.result = null;
      return end();
    }

    try {
      const approvedRequestData = (await requestUserApproval({
        origin,
        type: ApprovalType.SwitchEthereumChain,
        requestData,
      })) as Record<string, string>;
      if (
        Object.values(BUILT_IN_INFURA_NETWORKS)
          .map(({ chainId: id }) => id)
          .includes(_chainId)
      ) {
        await setProviderType(approvedRequestData.type as InfuraNetworkType);
      } else {
        await setActiveNetwork(approvedRequestData.id);
      }
      if (hasPermissions(req.origin)) {
        setNetworkClientIdForDomain(req.origin, networkClientId);
      }
      res.result = null;
    } catch (error: unknown) {
      return end(error as any);
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
