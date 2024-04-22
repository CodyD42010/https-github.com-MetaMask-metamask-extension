import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PercentageChange } from '.';
import { getIntlLocale } from '../../../../ducks/locale/locale';
import { getCurrentCurrency } from '../../../../selectors';

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector()),
}));

jest.mock('../../../../ducks/locale/locale', () => ({
  getIntlLocale: jest.fn(),
}));

jest.mock('../../../../selectors', () => ({
  getCurrentCurrency: jest.fn(),
}));

const mockGetIntlLocale = getIntlLocale as unknown as jest.Mock;
const mockGetCurrentCurrency = getCurrentCurrency as jest.Mock;

describe('PercentageChange Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('render', () => {
    it('renders correctly', () => {
      mockGetIntlLocale.mockReturnValue('en-US');
      mockGetCurrentCurrency.mockReturnValue('USD');

      const { container } = render(<PercentageChange value={5.123} />);
      expect(container).toMatchSnapshot();
    });
  });
  it('displays a positive value with a + sign and in green color', () => {
    mockGetIntlLocale.mockReturnValue('en-US');
    mockGetCurrentCurrency.mockReturnValue('USD');

    render(<PercentageChange value={5.123} />);
    const valueElement = screen.getByText(/\+5.12%/i);
    expect(valueElement).toBeInTheDocument();
  });

  it('displays a negative value with a - sign and in red color', () => {
    mockGetIntlLocale.mockReturnValue('en-US');
    mockGetCurrentCurrency.mockReturnValue('USD');

    render(<PercentageChange value={-2.345} />);
    const valueElement = screen.getByText(/-2.35%/i);
    expect(valueElement).toBeInTheDocument();
  });

  it('displays a zero value with a + sign and in green color', () => {
    mockGetIntlLocale.mockReturnValue('en-US');
    mockGetCurrentCurrency.mockReturnValue('USD');

    render(<PercentageChange value={0} />);
    const valueElement = screen.getByText(/\+0.00%/i);
    expect(valueElement).toBeInTheDocument();
  });

  it('renders an empty string when value is null', () => {
    mockGetIntlLocale.mockReturnValue('en-US');
    mockGetCurrentCurrency.mockReturnValue('USD');

    render(<PercentageChange value={null} />);
    const textElement = screen.getByTestId(
      'token-increase-decrease-percentage',
    );
    expect(textElement).toHaveTextContent('');
  });

  it('renders an empty string when value is an invalid number', () => {
    mockGetIntlLocale.mockReturnValue('en-US');
    mockGetCurrentCurrency.mockReturnValue('USD');

    render(<PercentageChange value={NaN} />);
    const textElement = screen.getByTestId(
      'token-increase-decrease-percentage',
    );
    expect(textElement).toHaveTextContent('');
  });

  it('renders empty strings for both percentage and value when value is null and includeNumber is true', () => {
    mockGetIntlLocale.mockReturnValue('en-US');
    mockGetCurrentCurrency.mockReturnValue('USD');

    render(<PercentageChange value={null} includeNumber={true} />);
    const percentageElement = screen.getByTestId(
      'token-increase-decrease-percentage',
    );
    const valueElement = screen.getByTestId('token-increase-decrease-value');
    expect(percentageElement).toHaveTextContent('');
    expect(valueElement).toHaveTextContent('');
  });

  it('displays empty string without color if value is not a number', () => {
    mockGetIntlLocale.mockReturnValue('en-US');
    mockGetCurrentCurrency.mockReturnValue('USD');

    render(<PercentageChange value={0} />);
    const valueElement = screen.getByText(/\+0.00%/i);
    expect(valueElement).toBeInTheDocument();
  });

  it('displays positive percentage with number in success color', () => {
    mockGetIntlLocale.mockReturnValue('en-US');
    mockGetCurrentCurrency.mockReturnValue('USD');

    render(
      <PercentageChange
        value={3.456}
        valueChange={100.12}
        includeNumber={true}
      />,
    );
    const percentageElement = screen.getByText('+3.46%');
    const numberElement = screen.getByText('+($100.12)');
    expect(percentageElement).toBeInTheDocument();
    expect(numberElement).toBeInTheDocument();
  });

  it('displays negative percentage with number in error color', () => {
    mockGetIntlLocale.mockReturnValue('en-US');
    mockGetCurrentCurrency.mockReturnValue('USD');

    render(
      <PercentageChange
        value={-1.234}
        valueChange={-200.34}
        includeNumber={true}
      />,
    );
    const percentageElement = screen.getByText('-1.23%');
    const numberElement = screen.getByText('(-$200.34)');
    expect(percentageElement).toBeInTheDocument();
    expect(numberElement).toBeInTheDocument();
  });
});
