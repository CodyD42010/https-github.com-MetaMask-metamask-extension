import assert from 'assert'
import proxyquire from 'proxyquire'

const {
  getCustomGasErrors,
  getCustomGasLimit,
  getCustomGasPrice,
  getCustomGasTotal,
  getEstimatedGasPrices,
  getEstimatedGasTimes,
  getPriceAndTimeEstimates,
  getRenderableBasicEstimateData,
  getRenderableEstimateDataForSmallButtons,
} = proxyquire('../custom-gas', {})

describe('custom-gas selectors', () => {

  describe('getCustomGasPrice()', () => {
    it('should return gas.customData.price', () => {
      const mockState = { gas: { customData: { price: 'mockPrice' } } }
      assert.equal(getCustomGasPrice(mockState), 'mockPrice')
    })
  })

  describe('getCustomGasLimit()', () => {
    it('should return gas.customData.limit', () => {
      const mockState = { gas: { customData: { limit: 'mockLimit' } } }
      assert.equal(getCustomGasLimit(mockState), 'mockLimit')
    })
  })

  describe('getCustomGasTotal()', () => {
    it('should return gas.customData.total', () => {
      const mockState = { gas: { customData: { total: 'mockTotal' } } }
      assert.equal(getCustomGasTotal(mockState), 'mockTotal')
    })
  })

  describe('getCustomGasErrors()', () => {
    it('should return gas.errors', () => {
      const mockState = { gas: { errors: 'mockErrors' } }
      assert.equal(getCustomGasErrors(mockState), 'mockErrors')
    })
  })

  describe('getPriceAndTimeEstimates', () => {
    it('should return price and time estimates', () => {
      const mockState = { gas: { priceAndTimeEstimates: 'mockPriceAndTimeEstimates' } }
      assert.equal(getPriceAndTimeEstimates(mockState), 'mockPriceAndTimeEstimates')
    })
  })

  describe('getEstimatedGasPrices', () => {
    it('should return price and time estimates', () => {
      const mockState = { gas: { priceAndTimeEstimates: [
        { gasprice: 12, somethingElse: 20 },
        { gasprice: 22, expectedTime: 30 },
        { gasprice: 32, somethingElse: 40 },
      ] } }
      assert.deepEqual(getEstimatedGasPrices(mockState), [12, 22, 32])
    })
  })

  describe('getEstimatedGasTimes', () => {
    it('should return price and time estimates', () => {
      const mockState = { gas: { priceAndTimeEstimates: [
        { somethingElse: 12, expectedTime: 20 },
        { gasPrice: 22, expectedTime: 30 },
        { somethingElse: 32, expectedTime: 40 },
      ] } }
      assert.deepEqual(getEstimatedGasTimes(mockState), [20, 30, 40])
    })
  })

  describe('getRenderableBasicEstimateData()', () => {
    const tests = [
      {
        expectedResult: [
          {
            labelKey: 'fastest',
            feeInPrimaryCurrency: '$0.05',
            feeInSecondaryCurrency: '0.00021 ETH',
            timeEstimate: '~7 sec',
            priceInHexWei: '0x2540be400',
          },
          {
            labelKey: 'fast',
            feeInPrimaryCurrency: '$0.03',
            feeInSecondaryCurrency: '0.000105 ETH',
            timeEstimate: '~46 sec',
            priceInHexWei: '0x12a05f200',
          },
          {
            labelKey: 'slow',
            feeInPrimaryCurrency: '$0.01',
            feeInSecondaryCurrency: '0.0000525 ETH',
            timeEstimate: '~1 min 33 sec',
            priceInHexWei: '0x9502f900',
          },
        ],
        mockState: {
          metamask: {
            conversionRate: 255.71,
            currentCurrency: 'usd',
            send: {
              gasLimit: '0x5208',
            },
          },
          gas: {
            basicEstimates: {
              blockTime: 14.16326530612245,
              safeLow: 25,
              safeLowWait: 6.6,
              average: 50,
              avgWait: 3.3,
              fast: 100,
              fastWait: 0.5,
            },
          },
        },
      },
      {
        expectedResult: [
          {
            labelKey: 'fastest',
            feeInPrimaryCurrency: '$1.07',
            feeInSecondaryCurrency: '0.00042 ETH',
            timeEstimate: '~14 sec',
            priceInHexWei: '0x4a817c800',
          },
          {
            labelKey: 'fast',
            feeInPrimaryCurrency: '$0.54',
            feeInSecondaryCurrency: '0.00021 ETH',
            timeEstimate: '~1 min 33 sec',
            priceInHexWei: '0x2540be400',
          },
          {
            labelKey: 'slow',
            feeInPrimaryCurrency: '$0.27',
            feeInSecondaryCurrency: '0.000105 ETH',
            timeEstimate: '~3 min 7 sec',
            priceInHexWei: '0x12a05f200',
          },
        ],
        mockState: {
          metamask: {
            conversionRate: 2557.1,
            currentCurrency: 'usd',
            send: {
              gasLimit: '0x5208',
            },
          },
          gas: {
            basicEstimates: {
              blockTime: 14.16326530612245,
              safeLow: 50,
              safeLowWait: 13.2,
              average: 100,
              avgWait: 6.6,
              fast: 200,
              fastWait: 1.0,
            },
          },
        },
      },
    ]
    it('should return renderable data about basic estimates', () => {
      tests.forEach(test => {
        assert.deepEqual(
          getRenderableBasicEstimateData(test.mockState),
          test.expectedResult
        )
      })
    })

  })

  describe('getRenderableEstimateDataForSmallButtons()', () => {
    const tests = [
      {
        expectedResult: [
          {
            feeInSecondaryCurrency: '$0.05',
            feeInPrimaryCurrency: '0.00021 ETH',
            labelKey: 'fast',
            priceInHexWei: '0x2540be400',
          },
          {
            feeInSecondaryCurrency: '$0.03',
            feeInPrimaryCurrency: '0.0001 ETH',
            labelKey: 'average',
            priceInHexWei: '0x12a05f200',
          },
          {
            feeInSecondaryCurrency: '$0.01',
            feeInPrimaryCurrency: '0.00005 ETH',
            labelKey: 'slow',
            priceInHexWei: '0x9502f900',
          },
        ],
        mockState: {
          metamask: {
            conversionRate: 255.71,
            currentCurrency: 'usd',
            send: {
              gasLimit: '0x5208',
            },
          },
          gas: {
            basicEstimates: {
              blockTime: 14.16326530612245,
              safeLow: 25,
              safeLowWait: 6.6,
              average: 50,
              avgWait: 3.3,
              fast: 100,
              fastWait: 0.5,
            },
          },
        },
      },
      {
        expectedResult: [
          {
            feeInSecondaryCurrency: '$1.07',
            feeInPrimaryCurrency: '0.00042 ETH',
            labelKey: 'fast',
            priceInHexWei: '0x4a817c800',
          },
          {
            feeInSecondaryCurrency: '$0.54',
            feeInPrimaryCurrency: '0.00021 ETH',
            labelKey: 'average',
            priceInHexWei: '0x2540be400',
          },
          {
            feeInSecondaryCurrency: '$0.27',
            feeInPrimaryCurrency: '0.0001 ETH',
            labelKey: 'slow',
            priceInHexWei: '0x12a05f200',
          },
        ],
        mockState: {
          metamask: {
            conversionRate: 2557.1,
            currentCurrency: 'usd',
            send: {
              gasLimit: '0x5208',
            },
          },
          gas: {
            basicEstimates: {
              blockTime: 14.16326530612245,
              safeLow: 50,
              safeLowWait: 13.2,
              average: 100,
              avgWait: 6.6,
              fast: 200,
              fastWait: 1.0,
            },
          },
        },
      },
    ]
    it('should return renderable data about basic estimates appropriate for buttons with less info', () => {
      tests.forEach(test => {
        assert.deepEqual(
          getRenderableEstimateDataForSmallButtons(test.mockState),
          test.expectedResult
        )
      })
    })

  })

})
