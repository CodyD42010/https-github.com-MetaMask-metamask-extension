import { ethErrors } from 'eth-rpc-errors';
import {
  JsonRpcParams,
  JsonRpcRequest,
  PendingJsonRpcResponse,
} from '@metamask/utils';
import {
  JsonRpcEngineEndCallback,
  JsonRpcEngineNextCallback,
} from '@metamask/json-rpc-engine';
import { OriginString } from '@metamask/permission-controller';
import { JsonRpcEngineCallbackError } from 'json-rpc-engine';
import { MESSAGE_TYPE } from '../../../../../shared/constants/app';
import {
  MetaMetricsEventName,
  MetaMetricsEventCategory,
} from '../../../../../shared/constants/metametrics';
import {
  GetAccounts,
  GetPermissionsForOrigin,
  GetUnlockPromise,
  HandlerWrapper,
  HasPermission,
  RequestAccountsPermission,
  SendMetrics,
} from './handlers-helper';

type RequestEthereumAccountsOptions = {
  origin: OriginString;
  getAccounts: GetAccounts;
  getUnlockPromise: GetUnlockPromise;
  hasPermission: HasPermission;
  requestAccountsPermission: RequestAccountsPermission;
  sendMetrics: SendMetrics;
  getPermissionsForOrigin: GetPermissionsForOrigin;
  metamaskState: unknown;
};

type RequestEthereumAccountsConstraint<
  Params extends JsonRpcParams = JsonRpcParams,
> = {
  implementation: (
    _req: JsonRpcRequest<Params>,
    res: PendingJsonRpcResponse<string[]>,
    _next: JsonRpcEngineNextCallback,
    end: JsonRpcEngineEndCallback,
    {
      origin,
      getAccounts,
      getUnlockPromise,
      hasPermission,
      requestAccountsPermission,
      sendMetrics,
      getPermissionsForOrigin,
      metamaskState,
    }: RequestEthereumAccountsOptions,
  ) => Promise<void>;
} & HandlerWrapper;

/**
 * This method attempts to retrieve the Ethereum accounts available to the
 * requester, or initiate a request for account access if none are currently
 * available. It is essentially a wrapper of wallet_requestPermissions that
 * only errors if the user rejects the request. We maintain the method for
 * backwards compatibility reasons.
 */
const requestEthereumAccounts = {
  methodNames: [MESSAGE_TYPE.ETH_REQUEST_ACCOUNTS],
  implementation: requestEthereumAccountsHandler,
  hookNames: {
    origin: true,
    getAccounts: true,
    getUnlockPromise: true,
    hasPermission: true,
    requestAccountsPermission: true,
    sendMetrics: true,
    getPermissionsForOrigin: true,
    metamaskState: true,
  },
} satisfies RequestEthereumAccountsConstraint;
export default requestEthereumAccounts;

// Used to rate-limit pending requests to one per origin
const locks = new Set();

/**
 *
 * @param _req - The JSON-RPC request object.
 * @param res - The JSON-RPC response object.
 * @param _next - The json-rpc-engine 'next' callback.
 * @param end - The json-rpc-engine 'end' callback.
 * @param options - The RPC method hooks.
 * @param options.origin - The requesting origin.
 * @param options.getAccounts - Gets the accounts for the requesting origin.
 * @param options.getUnlockPromise - Gets a promise that resolves when the extension unlocks.
 * @param options.hasPermission - Returns whether the requesting origin has the specified permission.
 * @param options.requestAccountsPermission - Requests the `eth_accounts` permission for the requesting origin.
 * @param options.sendMetrics - submits a metametrics event, not waiting for it to complete or allowing its error to bubble up
 * @param options.getPermissionsForOrigin - Gets all permissions for the specified subject, if any.
 * @param options.metamaskState
 */
async function requestEthereumAccountsHandler<
  Params extends JsonRpcParams = JsonRpcParams,
>(
  _req: JsonRpcRequest<Params>,
  res: PendingJsonRpcResponse<string[]>,
  _next: JsonRpcEngineNextCallback,
  end: JsonRpcEngineEndCallback,
  {
    origin,
    getAccounts,
    getUnlockPromise,
    hasPermission,
    requestAccountsPermission,
    sendMetrics,
    getPermissionsForOrigin,
    metamaskState,
  }: RequestEthereumAccountsOptions,
): Promise<void> {
  if (locks.has(origin)) {
    res.error = ethErrors.rpc.resourceUnavailable(
      `Already processing ${MESSAGE_TYPE.ETH_REQUEST_ACCOUNTS}. Please wait.`,
    );
    return end();
  }

  if (hasPermission(MESSAGE_TYPE.ETH_ACCOUNTS)) {
    // We wait for the extension to unlock in this case only, because permission
    // requests are handled when the extension is unlocked, regardless of the
    // lock state when they were received.
    try {
      locks.add(origin);
      await getUnlockPromise(true);
      res.result = await getAccounts();
      end();
    } catch (error: unknown) {
      end(error as JsonRpcEngineCallbackError);
    } finally {
      locks.delete(origin);
    }
    return undefined;
  }

  // If no accounts, request the accounts permission
  try {
    await requestAccountsPermission();
  } catch (err: unknown) {
    res.error = err;
    return end();
  }

  // Get the approved accounts
  const accounts = await getAccounts();
  /* istanbul ignore else: too hard to induce, see below comment */
  if (accounts.length > 0) {
    res.result = accounts;
    const permissionsForOrigin =
      getPermissionsForOrigin(origin)?.eth_accounts.caveats;
    const numberOfConnectedAccounts: number = permissionsForOrigin
      ? permissionsForOrigin[0].value.length
      : 0;
    sendMetrics({
      event: MetaMetricsEventName.DappViewed,
      category: MetaMetricsEventCategory.InpageProvider,
      referrer: {
        url: origin,
      },
      properties: {
        is_first_visit: true,
        number_of_accounts: Object.keys((metamaskState as any).accounts).length,
        number_of_accounts_connected: numberOfConnectedAccounts,
      },
    });
  } else {
    // This should never happen, because it should be caught in the
    // above catch clause
    res.error = ethErrors.rpc.internal(
      'Accounts unexpectedly unavailable. Please report this bug.',
    );
  }

  return end();
}
