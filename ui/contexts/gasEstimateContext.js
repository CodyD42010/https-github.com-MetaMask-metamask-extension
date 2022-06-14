import React, { createContext, useContext, useState } from 'react';
import PropTypes from 'prop-types';
import { isEqual } from 'lodash';

export const GasEstimateContext = createContext({});

export const GasEstimateContextProvider = ({ children }) => {
  const [gasEstimateType, setGasEstimateType] = useState();
  const [gasFeeEstimates, setGasFeeEstimates] = useState();
  // eslint-disable-next-line
  chrome.storage.onChanged.addListener((changes) => {
    for (const [field, { newValue }] of Object.entries(changes)) {
      if (field === 'ui_state') {
        console.log('-------------- UPDATING ESTIMATE -----------------');
        setGasEstimateType(newValue.gasEstimateType);
        setGasFeeEstimates(newValue.gasFeeEstimates);
      }
    }
  });

  return (
    <GasEstimateContext.Provider value={{ gasEstimateType, gasFeeEstimates }}>
      {children}
    </GasEstimateContext.Provider>
  );
};

export function useGasEstimateContext() {
  return useContext(GasEstimateContext);
}

GasEstimateContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
