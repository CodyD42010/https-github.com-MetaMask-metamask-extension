import { PPOM } from '@blockaid/ppom_release';
import { PPOMController } from '@metamask/ppom-validator';
import { NetworkController } from '@metamask/network-controller';
import { v4 as uuid } from 'uuid';

import {
  BlockaidReason,
  BlockaidResultType,
} from '../../../../shared/constants/security-provider';
import { CHAIN_IDS } from '../../../../shared/constants/network';
import { SIGNING_METHODS } from '../../../../shared/constants/transaction';
import { PreferencesController } from '../../controllers/preferences';
import { SecurityAlertResponse } from '../transaction/util';

const { sentry } = global as any;

const CONFIRMATION_METHODS = Object.freeze([
  'eth_sendRawTransaction',
  'eth_sendTransaction',
  ...SIGNING_METHODS,
]);

export const SUPPORTED_CHAIN_IDS: string[] = [
  CHAIN_IDS.MAINNET,
  CHAIN_IDS.BSC,
  CHAIN_IDS.POLYGON,
  CHAIN_IDS.ARBITRUM,
  CHAIN_IDS.OPTIMISM,
  CHAIN_IDS.AVALANCHE,
  CHAIN_IDS.LINEA_MAINNET,
];

/**
 * Middleware function that handles JSON RPC requests.
 * This function will be called for every JSON RPC request.
 * It will call the PPOM to check if the request is malicious or benign.
 * If the request is benign, it will be forwarded to the next middleware.
 * If the request is malicious or warning, it will trigger the PPOM alert dialog,
 * after the user has confirmed or rejected the request,
 * the request will be forwarded to the next middleware, together with the PPOM response.
 *
 * @param ppomController - Instance of PPOMController.
 * @param preferencesController - Instance of PreferenceController.
 * @param networkController - Instance of NetworkController.
 * @param appStateController
 * @param updateSecurityAlertResponseByTxId
 * @returns PPOMMiddleware function.
 */
export function createPPOMMiddleware(
  ppomController: PPOMController,
  preferencesController: PreferencesController,
  networkController: NetworkController,
  appStateController: any,
  updateSecurityAlertResponseByTxId: (
    req: any,
    securityAlertResponse: SecurityAlertResponse,
  ) => void,
) {
  return async (req: any, _res: any, next: () => void) => {
    try {
      const securityAlertsEnabled =
        preferencesController.store.getState()?.securityAlertsEnabled;
      const { chainId } = networkController.state.providerConfig;
      if (
        securityAlertsEnabled &&
        CONFIRMATION_METHODS.includes(req.method) &&
        SUPPORTED_CHAIN_IDS.includes(chainId)
      ) {
        // eslint-disable-next-line require-atomic-updates
        const securityAlertId = uuid();

        ppomController.usePPOM(async (ppom: PPOM) => {
          try {
            const securityAlertResponse = await ppom.validateJsonRpc(req);
            securityAlertResponse.securityAlertId = securityAlertId;
            updateSecurityAlertResponseByTxId(req, securityAlertResponse);
          } catch (error: any) {
            sentry?.captureException(error);
            console.error('Error validating JSON RPC using PPOM: ', error);
            const securityAlertResponse = {
              result_type: BlockaidResultType.Failed,
              reason: BlockaidReason.failed,
              description:
                'Validating the confirmation failed by throwing error.',
            };
            updateSecurityAlertResponseByTxId(req, securityAlertResponse);
          }
        });

        if (SIGNING_METHODS.includes(req.method)) {
          req.securityAlertResponse = {
            securityAlertId,
          };
          appStateController.addSignatureSecurityAlertResponse({
            reason: 'loading',
            result_type: 'validation_in_progress',
            securityAlertId,
          });
        } else {
          req.securityAlertResponse = {
            reason: 'loading',
            result_type: 'validation_in_progress',
            securityAlertId,
          };
        }
      }
    } catch (error: any) {
      sentry?.captureException(error);
      console.error('Error validating JSON RPC using PPOM: ', error);
      req.securityAlertResponse = {
        result_type: BlockaidResultType.Failed,
        reason: BlockaidReason.failed,
        description: 'Validating the confirmation failed by throwing error.',
      };
    } finally {
      next();
    }
  };
}
