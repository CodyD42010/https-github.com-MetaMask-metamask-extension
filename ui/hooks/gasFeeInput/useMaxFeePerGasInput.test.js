import { act, renderHook } from '@testing-library/react-hooks';

import { getMaximumGasTotalInHexWei } from '../../../shared/modules/gas.utils';
import { decimalToHex } from '../../helpers/utils/conversions.util';

import {
  FEE_MARKET_ESTIMATE_RETURN_VALUE,
  LEGACY_GAS_ESTIMATE_RETURN_VALUE,
  configure,
  convertFromHexToFiat,
} from './test-utils';
import { useMaxFeePerGasInput } from './useMaxFeePerGasInput';

jest.mock('../useGasFeeEstimates', () => ({
  useGasFeeEstimates: jest.fn(),
}));

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');

  return {
    ...actual,
    useSelector: jest.fn(),
  };
});

const renderUseMaxFeePerGasInputHook = (props) =>
  renderHook(() =>
    useMaxFeePerGasInput({
      gasLimit: '21000',
      supportsEIP1559: true,
      estimateToUse: 'medium',
      transaction: {
        userFeeLevel: 'custom',
        txParams: { maxFeePerGas: '0x5028' },
      },
      ...FEE_MARKET_ESTIMATE_RETURN_VALUE,
      ...props,
    }),
  );

describe('useMaxFeePerGasInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configure();
  });

  it('returns maxFeePerGas values from transaction if transaction.userFeeLevel is custom', () => {
    const { result } = renderUseMaxFeePerGasInputHook();
    expect(result.current.maxFeePerGas).toBe(0.00002052);
  });

  it('returns gasPrice values from transaction if transaction.userFeeLevel is custom and maxFeePerGas is not provided', () => {
    const { result } = renderUseMaxFeePerGasInputHook({
      transaction: {
        userFeeLevel: 'custom',
        txParams: { gasPrice: '0x5028' },
      },
    });
    expect(result.current.maxFeePerGas).toBe(0.00002052);
  });

  it('does not returns maxFeePerGas values from transaction if transaction.userFeeLevel is not custom', () => {
    const { result } = renderUseMaxFeePerGasInputHook({
      estimateToUse: 'high',
      transaction: {
        userFeeLevel: 'high',
        txParams: { maxFeePerGas: '0x5028' },
      },
    });
    expect(result.current.maxFeePerGas).toBe(
      FEE_MARKET_ESTIMATE_RETURN_VALUE.gasFeeEstimates.high
        .suggestedMaxFeePerGas,
    );
  });

  it('if no maxFeePerGas is provided by user or in transaction it returns value from fee market estimate', () => {
    const { result } = renderUseMaxFeePerGasInputHook({
      transaction: {
        userFeeLevel: 'high',
        txParams: {},
      },
    });
    expect(result.current.maxFeePerGas).toBe(
      FEE_MARKET_ESTIMATE_RETURN_VALUE.gasFeeEstimates.medium
        .suggestedMaxFeePerGas,
    );
  });

  it('maxFeePerGasFiat is maximum amount that the transaction can cost', () => {
    configure();
    const { result } = renderUseMaxFeePerGasInputHook();
    const maximumHexValue = getMaximumGasTotalInHexWei({
      gasLimit: decimalToHex('21000'),
      maxFeePerGas: '0x5028',
    });
    expect(result.current.maxFeePerGasFiat).toBe(
      convertFromHexToFiat(maximumHexValue),
    );
  });

  it('returns 0 if supportsEIP1559 is false', () => {
    const { result } = renderUseMaxFeePerGasInputHook({
      supportsEIP1559: false,
      ...LEGACY_GAS_ESTIMATE_RETURN_VALUE,
    });
    expect(result.current.maxFeePerGas).toBe('0');
  });

  it('returns maxFeePerGas set by user if setMaxFeePerGas is called', () => {
    const { result } = renderUseMaxFeePerGasInputHook();
    act(() => {
      result.current.setMaxFeePerGas(100);
    });
    expect(result.current.maxFeePerGas).toBe(100);
  });
});
