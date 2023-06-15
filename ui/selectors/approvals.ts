import { ApprovalControllerState } from '@metamask/approval-controller';
import { ApprovalType } from '@metamask/controller-utils';
import { TransactionMeta } from '../../shared/constants/transaction';

type ApprovalsMetaMaskState = {
  metamask: {
    pendingApprovals: ApprovalControllerState['pendingApprovals'];
    unapprovedTxs: {
      [transactionId: string]: TransactionMeta;
    };
  };
};

export function hasPendingApprovals(
  state: ApprovalsMetaMaskState,
  approvalType: ApprovalType,
  predicate?: (
    approval: ApprovalControllerState['pendingApprovals'][string],
  ) => boolean,
) {
  const pendingApprovalRequests = Object.values(
    state.metamask.pendingApprovals,
  ).filter(({ type }) => type === approvalType);

  if (predicate) {
    return pendingApprovalRequests.some(predicate);
  }

  return pendingApprovalRequests.length > 0;
}

export const getApprovalRequestsByType = (
  state: ApprovalsMetaMaskState,
  approvalType: ApprovalType,
  predicate?: (
    approval: ApprovalControllerState['pendingApprovals'][string],
  ) => boolean,
) => {
  const pendingApprovalRequests = Object.values(
    state.metamask.pendingApprovals,
  ).filter(({ type }) => type === approvalType);

  if (predicate) {
    return pendingApprovalRequests.filter(predicate);
  }

  return pendingApprovalRequests;
};
