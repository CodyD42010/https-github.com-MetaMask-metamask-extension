import SmartTransactionsController from '@metamask/smart-transactions-controller';
import {
  Fee,
  Fees,
  SmartTransactionStatuses,
  SmartTransaction,
} from '@metamask/smart-transactions-controller/dist/types';
import type { Hex } from '@metamask/utils';
import {
  TransactionController,
  TransactionMeta,
  TransactionParams,
} from '@metamask/transaction-controller';
import log from 'loglevel';
import {
  RestrictedControllerMessenger,
  EventConstraint,
} from '@metamask/base-controller';
import {
  AddApprovalRequest,
  UpdateRequestState,
  StartFlow,
  EndFlow,
} from '@metamask/approval-controller';

import { decimalToHex } from '../../../../shared/modules/conversion.utils';
import { CANCEL_GAS_LIMIT_DEC } from '../../../../shared/constants/smartTransactions';
import {
  SMART_TRANSACTION_CONFIRMATION_TYPES,
  ORIGIN_METAMASK,
} from '../../../../shared/constants/app';

const namespace = 'SmartTransactions';

type AllowedActions =
  | AddApprovalRequest
  | UpdateRequestState
  | StartFlow
  | EndFlow;

export type SmartTransactionsControllerMessenger =
  RestrictedControllerMessenger<
    typeof namespace,
    AllowedActions,
    EventConstraint,
    AllowedActions['type'],
    never
  >;

export type SubmitSmartTransactionRequest = {
  transactionMeta: TransactionMeta;
  smartTransactionsController: SmartTransactionsController;
  transactionController: TransactionController;
  isSmartTransaction: boolean;
  controllerMessenger: SmartTransactionsControllerMessenger;
  featureFlags: Record<string, any>;
};

export class SmartTransactionHook {
  #approvalFlowEnded: boolean;

  #approvalFlowId: string;

  #transactionMeta: TransactionMeta;

  #smartTransactionsController: SmartTransactionsController;

  #transactionController: TransactionController;

  #isSmartTransaction: boolean;

  #controllerMessenger: SmartTransactionsControllerMessenger;

  #featureFlags: Record<string, any>;

  #isDapp: boolean;

  #chainId: Hex;

  #txParams: TransactionParams;

  constructor(request: SubmitSmartTransactionRequest) {
    const {
      transactionMeta,
      smartTransactionsController,
      transactionController,
      isSmartTransaction,
      controllerMessenger,
      featureFlags,
    } = request;
    this.#approvalFlowId = '';
    this.#approvalFlowEnded = false;
    this.#transactionMeta = transactionMeta;
    this.#smartTransactionsController = smartTransactionsController;
    this.#transactionController = transactionController;
    this.#isSmartTransaction = isSmartTransaction;
    this.#controllerMessenger = controllerMessenger;
    this.#featureFlags = featureFlags;
    this.#isDapp = transactionMeta.origin !== ORIGIN_METAMASK;
    this.#chainId = transactionMeta.chainId;
    this.#txParams = transactionMeta.txParams;
  }

  async submit() {
    // Will cause TransactionController to publish to the RPC provider as normal.
    const useRegularTransactionSubmit = { transactionHash: undefined };
    if (!this.#isSmartTransaction) {
      return useRegularTransactionSubmit;
    }
    const { id: approvalFlowId } = await this.#controllerMessenger.call(
      'ApprovalController:startFlow',
    );
    this.#approvalFlowId = approvalFlowId;
    try {
      const getFeesResponse = await this.#smartTransactionsController.getFees(
        { ...this.#txParams, chainId: this.#chainId },
        undefined,
      );
      const submitTransactionResponse = await this.#signAndSubmitTransactions({
        getFeesResponse,
      });
      const uuid = submitTransactionResponse?.uuid;
      if (!uuid) {
        throw new Error('No smart transaction UUID');
      }
      const returnTxHashAsap =
        this.#featureFlags?.smartTransactions?.returnTxHashAsap;
      this.#addApprovalRequest({
        uuid,
      });
      this.#addListenerToUpdateStatusPage({
        uuid,
      });
      let transactionHash: string | undefined | null;
      if (returnTxHashAsap && submitTransactionResponse?.txHash) {
        transactionHash = submitTransactionResponse.txHash;
      } else {
        transactionHash = await this.#waitForTransactionHash({
          uuid,
        });
      }
      if (transactionHash === null) {
        throw new Error(
          'Transaction does not have a transaction hash, there was a problem',
        );
      }
      return { transactionHash };
    } catch (error) {
      log.error('Error in smart transaction publish hook', error);
      this.onApproveOrReject();
      throw error;
    }
  }

  async onApproveOrReject() {
    if (this.#approvalFlowEnded) {
      return;
    }
    this.#approvalFlowEnded = true;
    this.#controllerMessenger.call('ApprovalController:endFlow', {
      id: this.#approvalFlowId,
    });
  }

  #addApprovalRequest({ uuid }: { uuid: string }) {
    const onApproveOrRejectWrapper = () => {
      this.onApproveOrReject();
    };
    this.#controllerMessenger
      .call(
        'ApprovalController:addRequest',
        {
          id: this.#approvalFlowId,
          origin,
          type: SMART_TRANSACTION_CONFIRMATION_TYPES.showSmartTransactionStatusPage,
          requestState: {
            smartTransaction: {
              status: SmartTransactionStatuses.PENDING,
              creationTime: Date.now(),
              uuid,
            },
            isDapp: this.#isDapp,
          },
        },
        true,
      )
      .then(onApproveOrRejectWrapper, onApproveOrRejectWrapper);
  }

  async #updateApprovalRequest({
    smartTransaction,
  }: {
    smartTransaction: SmartTransaction;
  }) {
    return await this.#controllerMessenger.call(
      'ApprovalController:updateRequestState',
      {
        id: this.#approvalFlowId,
        requestState: {
          smartTransaction,
          isDapp: this.#isDapp,
        },
      },
    );
  }

  async #addListenerToUpdateStatusPage({ uuid }: { uuid: string }) {
    (this.#smartTransactionsController as any).eventEmitter.on(
      `${uuid}:smartTransaction`,
      async (smartTransaction: SmartTransaction) => {
        const { status } = smartTransaction;
        if (!status || status === SmartTransactionStatuses.PENDING) {
          return;
        }
        if (!this.#approvalFlowEnded) {
          await this.#updateApprovalRequest({
            smartTransaction,
          });
        }
      },
    );
  }

  #waitForTransactionHash({ uuid }: { uuid: string }): Promise<string | null> {
    return new Promise((resolve) => {
      (this.#smartTransactionsController as any).eventEmitter.on(
        `${uuid}:smartTransaction`,
        async (smartTransaction: SmartTransaction) => {
          const { status, statusMetadata } = smartTransaction;
          if (!status || status === SmartTransactionStatuses.PENDING) {
            return;
          }
          log.debug('Smart Transaction: ', smartTransaction);
          if (statusMetadata?.minedHash) {
            log.debug(
              'Smart Transaction - Received tx hash: ',
              statusMetadata?.minedHash,
            );
            resolve(statusMetadata.minedHash);
          } else {
            resolve(null);
          }
        },
      );
    });
  }

  async #signAndSubmitTransactions({
    getFeesResponse,
  }: {
    getFeesResponse: Fees;
  }) {
    const signedTransactions = await this.#createSignedTransactions(
      getFeesResponse.tradeTxFees?.fees ?? [],
      false,
    );
    const signedCanceledTransactions = await this.#createSignedTransactions(
      getFeesResponse.tradeTxFees?.cancelFees || [],
      true,
    );
    return await this.#smartTransactionsController.submitSignedTransactions({
      signedTransactions,
      signedCanceledTransactions,
      txParams: this.#txParams,
      transactionMeta: this.#transactionMeta,
    });
  }

  #applyFeeToTransaction(fee: Fee, isCancel: boolean): TransactionParams {
    const unsignedTransaction = {
      ...this.#txParams,
      maxFeePerGas: `0x${decimalToHex(fee.maxFeePerGas)}`,
      maxPriorityFeePerGas: `0x${decimalToHex(fee.maxPriorityFeePerGas)}`,
      gas: isCancel
        ? `0x${decimalToHex(CANCEL_GAS_LIMIT_DEC)}` // It has to be 21000 for cancel transactions, otherwise the API would reject it.
        : this.#txParams.gas,
    };
    if (isCancel) {
      unsignedTransaction.to = unsignedTransaction.from;
      unsignedTransaction.data = '0x';
    }
    return unsignedTransaction;
  }

  async #createSignedTransactions(
    fees: Fee[],
    isCancel: boolean,
  ): Promise<string[]> {
    const unsignedTransactions = fees.map((fee) => {
      return this.#applyFeeToTransaction(fee, isCancel);
    });
    const transactionsWithChainId = unsignedTransactions.map((tx) => ({
      ...tx,
      chainId: tx.chainId || this.#chainId,
    }));
    return (await this.#transactionController.approveTransactionsWithSameNonce(
      transactionsWithChainId,
      { hasNonce: true },
    )) as string[];
  }
}
