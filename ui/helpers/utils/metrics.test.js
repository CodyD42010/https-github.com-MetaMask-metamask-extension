import {
  BlockaidReason,
  BlockaidResultType,
} from '../../../shared/constants/security-provider';
import { getBlockaidMetricsParams, getMethodName } from './metrics';

describe('getMethodName', () => {
  it('should get correct method names', () => {
    expect(getMethodName(undefined)).toStrictEqual('');
    expect(getMethodName({})).toStrictEqual('');
    expect(getMethodName('confirm')).toStrictEqual('confirm');
    expect(getMethodName('balanceOf')).toStrictEqual('balance Of');
    expect(getMethodName('ethToTokenSwapInput')).toStrictEqual(
      'eth To Token Swap Input',
    );
  });
});

describe('getBlockaidMetricsParams', () => {
  it('should return empty object when securityAlertResponse is not defined', () => {
    const result = getBlockaidMetricsParams({});
    expect(result).toStrictEqual({});
  });

  it('should return additionalParams object when securityAlertResponse defined', () => {
    const transaction = {
      securityAlertResponse: {
        result_type: BlockaidResultType.Malicious,
        reason: BlockaidReason.setApprovalForAll,
        providerRequestsCount: {
          eth_call: 5,
          eth_getCode: 3,
        },
        features: [],
      },
    };

    const result = getBlockaidMetricsParams(transaction);
    expect(result).toStrictEqual({
      ppom_eth_call_count: 5,
      ppom_eth_getCode_count: 3,
      security_alert_reason: BlockaidReason.setApprovalForAll,
      security_alert_response: BlockaidResultType.Malicious,
      ui_customizations: ['flagged_as_malicious'],
    });
  });

  it('should not return eth call counts if providerRequestsCount is empty', () => {
    const transaction = {
      securityAlertResponse: {
        result_type: BlockaidResultType.Malicious,
        reason: BlockaidReason.notApplicable,
        features: [],
        providerRequestsCount: {},
      },
    };

    const result = getBlockaidMetricsParams(transaction);
    expect(result).toStrictEqual({
      ui_customizations: ['flagged_as_malicious'],
      security_alert_response: BlockaidResultType.Malicious,
      security_alert_reason: BlockaidReason.notApplicable,
    });
  });

  it('should not return eth call counts if providerRequestsCount is undefined', () => {
    const transaction = {
      securityAlertResponse: {
        result_type: BlockaidResultType.Malicious,
        reason: BlockaidReason.notApplicable,
        features: [],
        providerRequestsCount: undefined,
      },
    };

    const result = getBlockaidMetricsParams(transaction);
    expect(result).toStrictEqual({
      ui_customizations: ['flagged_as_malicious'],
      security_alert_response: BlockaidResultType.Malicious,
      security_alert_reason: BlockaidReason.notApplicable,
    });
  });
});
