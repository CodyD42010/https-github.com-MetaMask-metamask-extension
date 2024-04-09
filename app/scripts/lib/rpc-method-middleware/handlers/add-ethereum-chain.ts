import { ApprovalType } from '@metamask/controller-utils';
import { errorCodes, ethErrors } from 'eth-rpc-errors';
import { omit } from 'lodash';
import type {
  JsonRpcEngineCallbackError,
  JsonRpcEngineNextCallback,
  JsonRpcEngineEndCallback,
} from '@metamask/json-rpc-engine';
import type {
  JsonRpcRequest,
  PendingJsonRpcResponse,
  JsonRpcParams,
  Hex,
} from '@metamask/utils';
import { ProviderConfig } from '@metamask/network-controller';
import {
  MESSAGE_TYPE,
  UNKNOWN_TICKER_SYMBOL,
} from '../../../../../shared/constants/app';
import { MetaMetricsNetworkEventSource } from '../../../../../shared/constants/metametrics';
import {
  isPrefixedFormattedHexString,
  isSafeChainId,
} from '../../../../../shared/modules/network.utils';
import { getValidUrl } from '../../util';
import {
  EndApprovalFlow,
  FindNetworkConfigurationBy,
  GetCurrentChainId,
  GetCurrentRpcUrl,
  GetProviderConfig,
  HandlerWrapper,
  HasPermission,
  RequestUserApproval,
  SetActiveNetwork,
  SetNetworkClientIdForDomain,
  StartApprovalFlow,
  UpsertNetworkConfiguration,
} from './handlers-helper';

type AddEthereumChainOptions = {
  upsertNetworkConfiguration: UpsertNetworkConfiguration;
  getCurrentChainId: GetCurrentChainId;
  getCurrentRpcUrl: GetCurrentRpcUrl;
  findNetworkConfigurationBy: FindNetworkConfigurationBy;
  setNetworkClientIdForDomain: SetNetworkClientIdForDomain;
  setActiveNetwork: SetActiveNetwork;
  requestUserApproval: RequestUserApproval;
  startApprovalFlow: StartApprovalFlow;
  endApprovalFlow: EndApprovalFlow;
  getProviderConfig: GetProviderConfig;
  hasPermissions: HasPermission;
};

type AddEthereumChainConstraint<Params extends JsonRpcParams = JsonRpcParams> =
  {
    implementation: (
      req: JsonRpcRequest<Params>,
      res: PendingJsonRpcResponse<null>,
      _next: JsonRpcEngineNextCallback,
      end: JsonRpcEngineEndCallback,
      options: AddEthereumChainOptions,
    ) => void;
  } & HandlerWrapper;

const addEthereumChain = {
  methodNames: [MESSAGE_TYPE.ADD_ETHEREUM_CHAIN],
  implementation: addEthereumChainHandler,
  hookNames: {
    upsertNetworkConfiguration: true,
    getCurrentChainId: true,
    getCurrentRpcUrl: true,
    findNetworkConfigurationBy: true,
    setNetworkClientIdForDomain: true,
    setActiveNetwork: true,
    requestUserApproval: true,
    startApprovalFlow: true,
    endApprovalFlow: true,
    getProviderConfig: true,
    hasPermissions: true,
  },
} satisfies AddEthereumChainConstraint;
export default addEthereumChain;

async function addEthereumChainHandler<
  Params extends JsonRpcParams = JsonRpcParams,
>(
  req: JsonRpcRequest<Params>,
  res: PendingJsonRpcResponse<null>,
  _next: JsonRpcEngineNextCallback,
  end: JsonRpcEngineEndCallback,
  {
    upsertNetworkConfiguration,
    getCurrentChainId,
    getCurrentRpcUrl,
    findNetworkConfigurationBy,
    setNetworkClientIdForDomain,
    setActiveNetwork,
    requestUserApproval,
    startApprovalFlow,
    endApprovalFlow,
    getProviderConfig,
    hasPermissions,
  }: AddEthereumChainOptions,
): Promise<void> {
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

  const {
    chainId,
    chainName = null,
    blockExplorerUrls = null,
    nativeCurrency = null,
    rpcUrls,
  } = req.params[0];

  const otherKeys: string[] = Object.keys(
    omit(req.params[0], [
      'chainId',
      'chainName',
      'blockExplorerUrls',
      'iconUrls',
      'rpcUrls',
      'nativeCurrency',
    ]),
  );

  if (otherKeys.length > 0) {
    return end(
      ethErrors.rpc.invalidParams({
        message: `Received unexpected keys on object parameter. Unsupported keys:\n${otherKeys}`,
      }),
    );
  }

  function isLocalhostOrHttps(urlString: string): boolean {
    const url: URL | null = getValidUrl(urlString);

    return (
      url !== null &&
      (url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.protocol === 'https:')
    );
  }

  const firstValidRPCUrl: string | null = Array.isArray(rpcUrls)
    ? rpcUrls.find((rpcUrl) => isLocalhostOrHttps(rpcUrl))
    : null;

  const firstValidBlockExplorerUrl: string | null =
    blockExplorerUrls !== null && Array.isArray(blockExplorerUrls)
      ? blockExplorerUrls.find((blockExplorerUrl) =>
          isLocalhostOrHttps(blockExplorerUrl),
        )
      : null;

  if (!firstValidRPCUrl) {
    return end(
      ethErrors.rpc.invalidParams({
        message: `Expected an array with at least one valid string HTTPS url 'rpcUrls', Received:\n${rpcUrls}`,
      }),
    );
  }

  if (blockExplorerUrls !== null && !firstValidBlockExplorerUrl) {
    return end(
      ethErrors.rpc.invalidParams({
        message: `Expected null or array with at least one valid string HTTPS URL 'blockExplorerUrl'. Received: ${blockExplorerUrls}`,
      }),
    );
  }

  const _chainId: Hex = (typeof chainId === 'string' &&
    chainId.toLowerCase()) as Hex;

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

  const existingNetwork: ProviderConfig | null = findNetworkConfigurationBy({
    chainId: _chainId,
  });

  // if the request is to add a network that is already added and configured
  // with the same RPC gateway we shouldn't try to add it again.
  if (existingNetwork && existingNetwork.rpcUrl === firstValidRPCUrl) {
    // If the network already exists, the request is considered successful
    res.result = null;

    const currentChainId: Hex = getCurrentChainId();
    const currentRpcUrl: string | undefined = getCurrentRpcUrl();

    // If the current chainId and rpcUrl matches that of the incoming request
    // We don't need to proceed further.
    if (currentChainId === _chainId && currentRpcUrl === firstValidRPCUrl) {
      return end();
    }

    // If this network is already added with but is not the currently selected network
    // Ask the user to switch the network
    try {
      await requestUserApproval({
        origin,
        type: ApprovalType.SwitchEthereumChain,
        requestData: {
          toNetworkConfiguration: existingNetwork,
          fromNetworkConfiguration: getProviderConfig(),
        },
      });

      await setActiveNetwork(existingNetwork.id as string);
      res.result = null;
    } catch (error: any) {
      // For the purposes of this method, it does not matter if the user
      // declines to switch the selected network. However, other errors indicate
      // that something is wrong.
      if (error.code !== errorCodes.provider.userRejectedRequest) {
        return end(error);
      }
    }
    return end();
  }

  if (typeof chainName !== 'string' || !chainName) {
    return end(
      ethErrors.rpc.invalidParams({
        message: `Expected non-empty string 'chainName'. Received:\n${chainName}`,
      }),
    );
  }
  const _chainName: string =
    chainName.length > 100 ? chainName.substring(0, 100) : chainName;

  if (nativeCurrency !== null) {
    if (typeof nativeCurrency !== 'object' || Array.isArray(nativeCurrency)) {
      return end(
        ethErrors.rpc.invalidParams({
          message: `Expected null or object 'nativeCurrency'. Received:\n${nativeCurrency}`,
        }),
      );
    }
    if (nativeCurrency.decimals !== 18) {
      return end(
        ethErrors.rpc.invalidParams({
          message: `Expected the number 18 for 'nativeCurrency.decimals' when 'nativeCurrency' is provided. Received: ${nativeCurrency.decimals}`,
        }),
      );
    }

    if (!nativeCurrency.symbol || typeof nativeCurrency.symbol !== 'string') {
      return end(
        ethErrors.rpc.invalidParams({
          message: `Expected a string 'nativeCurrency.symbol'. Received: ${nativeCurrency.symbol}`,
        }),
      );
    }
  }

  const ticker: string = nativeCurrency?.symbol || UNKNOWN_TICKER_SYMBOL;

  if (
    ticker !== UNKNOWN_TICKER_SYMBOL &&
    (typeof ticker !== 'string' || ticker.length < 2 || ticker.length > 6)
  ) {
    return end(
      ethErrors.rpc.invalidParams({
        message: `Expected 2-6 character string 'nativeCurrency.symbol'. Received:\n${ticker}`,
      }),
    );
  }
  // if the chainId is the same as an existing network but the ticker is different we want to block this action
  // as it is potentially malicious and confusing
  if (
    existingNetwork &&
    existingNetwork.chainId === _chainId &&
    existingNetwork.ticker !== ticker
  ) {
    return end(
      ethErrors.rpc.invalidParams({
        message: `nativeCurrency.symbol does not match currency symbol for a network the user already has added with the same chainId. Received:\n${ticker}`,
      }),
    );
  }
  let networkConfigurationId: string;

  const { id: approvalFlowId } = await startApprovalFlow();

  try {
    await requestUserApproval({
      origin,
      type: ApprovalType.AddEthereumChain,
      requestData: {
        chainId: _chainId,
        rpcPrefs: { blockExplorerUrl: firstValidBlockExplorerUrl },
        chainName: _chainName,
        rpcUrl: firstValidRPCUrl,
        ticker,
      },
    });

    networkConfigurationId = await upsertNetworkConfiguration(
      {
        chainId: _chainId,
        rpcPrefs: { blockExplorerUrl: firstValidBlockExplorerUrl as string },
        nickname: _chainName,
        rpcUrl: firstValidRPCUrl,
        ticker,
      },
      { source: MetaMetricsNetworkEventSource.Dapp, referrer: origin },
    );

    // Once the network has been added, the requested is considered successful
    res.result = null;
  } catch (error: unknown) {
    endApprovalFlow({ id: approvalFlowId });
    return end(error as JsonRpcEngineCallbackError);
  }

  // Ask the user to switch the network
  try {
    await requestUserApproval({
      origin,
      type: ApprovalType.SwitchEthereumChain,
      requestData: {
        toNetworkConfiguration: {
          rpcUrl: firstValidRPCUrl,
          chainId: _chainId,
          nickname: _chainName,
          ticker,
          networkConfigurationId,
        },
        fromNetworkConfiguration: getProviderConfig(),
      },
    });
    if (hasPermissions(req.origin)) {
      setNetworkClientIdForDomain(req.origin, networkConfigurationId);
    }
  } catch (error: any) {
    // For the purposes of this method, it does not matter if the user
    // declines to switch the selected network. However, other errors indicate
    // that something is wrong.
    return end(
      error.code === errorCodes.provider.userRejectedRequest
        ? undefined
        : error,
    );
  } finally {
    endApprovalFlow({ id: approvalFlowId });
  }

  try {
    await setActiveNetwork(networkConfigurationId);
  } catch (error: unknown) {
    return end(error as JsonRpcEngineCallbackError);
  }

  return end();
}
