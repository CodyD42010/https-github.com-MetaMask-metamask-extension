import { ApprovalControllerState } from '@metamask/approval-controller';
import { TransactionType } from '@metamask/transaction-controller';

export type SignatureRequestType = {
  chainId?: string;
  id: string;
  msgParams?: {
    from: string;
    origin: string;
    data: string;
  };
  type: TransactionType;
  custodyId?: string;
};

export type SomeTransaction = Record<any, any>;

export type Confirmation = SignatureRequestType | SomeTransaction;

export type ConfirmMetamaskState = {
  confirm: {
    currentConfirmation?: Confirmation;
  };
  metamask: {
    pendingApprovals: ApprovalControllerState['pendingApprovals'];
    approvalFlows: ApprovalControllerState['approvalFlows'];
  };
};
