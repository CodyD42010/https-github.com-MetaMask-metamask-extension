import React from 'react';
import { action } from '@storybook/addon-actions';
import { text, boolean, number, object } from '@storybook/addon-knobs';
import { MAINNET_CHAIN_ID } from '../../../../shared/constants/network';
import FeeCard from './fee-card';

const tokenApprovalTextComponent = (
  <span key="fee-card-approve-symbol" className="view-quote__bold">
    ABC
  </span>
);

const containerStyle = {
  width: '300px',
};

export default {
  title: 'Pages/Swaps/FeeCard',
  id: __filename,
};

export const WithAllProps = () => {
  return (
    <div style={containerStyle}>
      <FeeCard
        feeRowText={text('feeRowText', 'Network fees')}
        primaryFee={{
          fee: text('primaryFee', '1 ETH'),
          maxFee: text('primaryMaxFee', '2 ETH'),
        }}
        secondaryFee={{
          fee: text('secondaryFee', '100 USD'),
          maxFee: text('secondaryMaxFee', '200 USD'),
        }}
        chainId={MAINNET_CHAIN_ID}
        networkAndAccountSupports1559={false}
        onFeeCardMaxRowClick={action('Clicked max fee row link')}
        tokenApprovalTextComponent={tokenApprovalTextComponent}
        tokenApprovalSourceTokenSymbol="ABC"
        onTokenApprovalClick={action('Clicked third row link')}
        hideTokenApprovalRow={false}
        metaMaskFee="0.875"
        savings={object('savings 1', { total: '8.55' })}
        onQuotesClick={action('Clicked quotes link')}
        numberOfQuotes={number('numberOfQuotes', 6)}
        isBestQuote={boolean('isBestQuote', true)}
        conversionRate={300}
        currentCurrency="usd"
      />
    </div>
  );
};

export const WithoutThirdRow = () => {
  return (
    <div style={containerStyle}>
      <FeeCard
        feeRowText={text('feeRowText', 'Network fees')}
        primaryFee={{
          fee: text('primaryFee', '1 ETH'),
          maxFee: text('primaryMaxFee', '2 ETH'),
        }}
        secondaryFee={{
          fee: text('secondaryFee', '100 USD'),
          maxFee: text('secondaryMaxFee', '200 USD'),
        }}
        onFeeCardMaxRowClick={action('Clicked max fee row link')}
        hideTokenApprovalRow
        onQuotesClick={action('Clicked quotes link')}
        numberOfQuotes={number('numberOfQuotes', 1)}
        isBestQuote={boolean('isBestQuote', true)}
        savings={object('savings 1', { total: '8.55' })}
        metaMaskFee="0.875"
        chainId={MAINNET_CHAIN_ID}
        networkAndAccountSupports1559={false}
      />
    </div>
  );
};

export const WithOnlyRequiredProps = () => {
  return (
    <div style={containerStyle}>
      <FeeCard
        primaryFee={{
          fee: text('primaryFee', '1 ETH'),
          maxFee: text('primaryMaxFee', '2 ETH'),
        }}
        onFeeCardMaxRowClick={action('Clicked max fee row link')}
        hideTokenApprovalRow
        metaMaskFee="0.875"
        onQuotesClick={action('Clicked quotes link')}
        numberOfQuotes={2}
        chainId={MAINNET_CHAIN_ID}
        networkAndAccountSupports1559={false}
      />
    </div>
  );
};
