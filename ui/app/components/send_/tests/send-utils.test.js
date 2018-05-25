import assert from 'assert'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import {
  ONE_GWEI_IN_WEI_HEX,
  SIMPLE_GAS_COST,
} from '../send.constants'
const {
  addCurrencies,
  subtractCurrencies,
} = require('../../../conversion-util')

const {
  INSUFFICIENT_FUNDS_ERROR,
  INSUFFICIENT_TOKENS_ERROR,
} = require('../send.constants')

const stubs = {
  addCurrencies: sinon.stub().callsFake((a, b, obj) => a + b),
  conversionUtil: sinon.stub().callsFake((val, obj) => parseInt(val, 16)),
  conversionGTE: sinon.stub().callsFake((obj1, obj2) => obj1.value > obj2.value),
  multiplyCurrencies: sinon.stub().callsFake((a, b) => `${a}x${b}`),
  calcTokenAmount: sinon.stub().callsFake((a, d) => 'calc:' + a + d),
  rawEncode: sinon.stub().returns([16, 1100]),
}

const EthQuery = function () {}
EthQuery.prototype.estimateGas = sinon.stub().callsFake(
  (data) => Promise.resolve({ toString: (n) => `mockToString:${n}` })
)
EthQuery.prototype.getCode = sinon.stub().callsFake(
  (address) => Promise.resolve(address.match(/isContract/) ? 'not-0x' : '0x') 
)

const sendUtils = proxyquire('../send.utils.js', {
  '../../conversion-util': {
    addCurrencies: stubs.addCurrencies,
    conversionUtil: stubs.conversionUtil,
    conversionGTE: stubs.conversionGTE,
    multiplyCurrencies: stubs.multiplyCurrencies,
  },
  '../../token-util': { calcTokenAmount: stubs.calcTokenAmount },
  'ethereumjs-abi': {
    rawEncode: stubs.rawEncode,
  },
  'ethjs-query': EthQuery,
})

const {
  calcGasTotal,
  estimateGas,
  doesAmountErrorRequireUpdate,
  estimateGasPriceFromRecentBlocks,
  generateTokenTransferData,
  getAmountErrorObject,
  calcTokenBalance,
  isBalanceSufficient,
  isTokenBalanceSufficient,
} = sendUtils

describe('send utils', () => {

  describe('calcGasTotal()', () => {
    it('should call multiplyCurrencies with the correct params and return the multiplyCurrencies return', () => {
      const result = calcGasTotal(12, 15)
      assert.equal(result, '12x15')
      const call_ = stubs.multiplyCurrencies.getCall(0).args
      assert.deepEqual(
        call_,
        [12, 15, {
          toNumericBase: 'hex',
           multiplicandBase: 16,
           multiplierBase: 16,
         } ]
      )
    })
  })

  describe('doesAmountErrorRequireUpdate()', () => {
    const config = {
      'should return true if balances are different': {
        balance: 0,
        prevBalance: 1,
        expectedResult: true,
      },
      'should return true if gasTotals are different': {
        gasTotal: 0,
        prevGasTotal: 1,
        expectedResult: true,
      },
      'should return true if token balances are different': {
        tokenBalance: 0,
        prevTokenBalance: 1,
        selectedToken: 'someToken',
        expectedResult: true,
      },
      'should return false if they are all the same': {
        balance: 1,
        prevBalance: 1,
        gasTotal: 1,
        prevGasTotal: 1,
        tokenBalance: 1,
        prevTokenBalance: 1,
        selectedToken: 'someToken',
        expectedResult: false,
      },
    }
    Object.entries(config).map(([description, obj]) => {
      it(description, () => {
        assert.equal(doesAmountErrorRequireUpdate(obj), obj.expectedResult)
      })
    })

  })

  describe('generateTokenTransferData()', () => {
    it('should return undefined if not passed a selected token', () => {
      assert.equal(generateTokenTransferData('mockAddress', false), undefined)
    })

    it('should return encoded token transfer data', () => {
      assert.equal(generateTokenTransferData('mockAddress', true), '104c')
    })
  })

  describe('getAmountErrorObject()', () => {
    const config = {
      'should return insufficientFunds error if isBalanceSufficient returns false': {
        amount: 15,
        amountConversionRate: 2,
        balance: 1,
        conversionRate: 3,
        gasTotal: 17,
        primaryCurrency: 'ABC',
        expectedResult: { amount: INSUFFICIENT_FUNDS_ERROR },
      },
      'should return insufficientTokens error if token is selected and isTokenBalanceSufficient returns false': {
        amount: '0x10',
        amountConversionRate: 2,
        balance: 100,
        conversionRate: 3,
        decimals: 10,
        gasTotal: 17,
        primaryCurrency: 'ABC',
        selectedToken: 'someToken',
        tokenBalance: 123,
        expectedResult: { amount: INSUFFICIENT_TOKENS_ERROR },
      },
    }
    Object.entries(config).map(([description, obj]) => {
      it(description, () => {
        assert.deepEqual(getAmountErrorObject(obj), obj.expectedResult)
      })
    })
  })

  describe('calcTokenBalance()', () => {
    it('should return the calculated token blance', () => {
      assert.equal(calcTokenBalance({
        selectedToken: {
          decimals: 11,
        },
        usersToken: {
          balance: 20,
        },
      }), 'calc:2011')
    })
  })

  describe('isBalanceSufficient()', () => {
    it('should correctly call addCurrencies and return the result of calling conversionGTE', () => {
      stubs.conversionGTE.resetHistory()
      const result = isBalanceSufficient({
        amount: 15,
        amountConversionRate: 2,
        balance: 100,
        conversionRate: 3,
        gasTotal: 17,
        primaryCurrency: 'ABC',
      })
      assert.deepEqual(
        stubs.addCurrencies.getCall(0).args,
        [
          15, 17, {
            aBase: 16,
            bBase: 16,
            toNumericBase: 'hex',
          },
        ]
      )
      assert.deepEqual(
        stubs.conversionGTE.getCall(0).args,
        [
          {
            value: 100,
            fromNumericBase: 'hex',
            fromCurrency: 'ABC',
            conversionRate: 3,
          },
          {
            value: 32,
            fromNumericBase: 'hex',
            conversionRate: 2,
            fromCurrency: 'ABC',
          },
        ]
      )

      assert.equal(result, true)
    })
  })

  describe('isTokenBalanceSufficient()', () => {
    it('should correctly call conversionUtil and return the result of calling conversionGTE', () => {
      stubs.conversionGTE.resetHistory()
      const result = isTokenBalanceSufficient({
        amount: '0x10',
        tokenBalance: 123,
        decimals: 10,
      })
      assert.deepEqual(
        stubs.conversionUtil.getCall(0).args,
        [
          '0x10', {
            fromNumericBase: 'hex',
          },
        ]
      )
      assert.deepEqual(
        stubs.conversionGTE.getCall(0).args,
        [
          {
            value: 123,
            fromNumericBase: 'dec',
          },
          {
            value: 'calc:1610',
            fromNumericBase: 'dec',
          },
        ]
      )

      assert.equal(result, false)
    })
  })

  describe('estimateGas', () => {
    const baseMockParams = {
      blockGasLimit: '0x64',
      selectedAddress: 'mockAddress',
      to: '0xisContract',
    }
    const baseExpectedCall = {
      from: 'mockAddress',
      gas: '0x64x0.95',
      to: '0xisContract',
    }

    afterEach(() => {
      EthQuery.prototype.estimateGas.resetHistory()
      EthQuery.prototype.getCode.resetHistory()
    })

    it('should call ethQuery.estimateGas with the expected params', async () => {
      const result = await estimateGas(baseMockParams)
      assert.equal(EthQuery.prototype.estimateGas.callCount, 1)
      assert.deepEqual(
        EthQuery.prototype.estimateGas.getCall(0).args[0],
        baseExpectedCall
      )
      assert.equal(result, 'mockToString:16')
    })

    it('should call ethQuery.estimateGas with a value of 0x0 if the passed selectedToken has a symbol', async () => {
      const result = await estimateGas(Object.assign({ selectedToken: { symbol: true } }, baseMockParams))
      assert.equal(EthQuery.prototype.estimateGas.callCount, 1)
      assert.deepEqual(
        EthQuery.prototype.estimateGas.getCall(0).args[0],
        Object.assign({ value: '0x0' }, baseExpectedCall)
      )
      assert.equal(result, 'mockToString:16')
    })

    it('should call ethQuery.estimateGas with data if data is passed', async () => {
      const result = await estimateGas(Object.assign({ data: 'mockData' }, baseMockParams))
      assert.equal(EthQuery.prototype.estimateGas.callCount, 1)
      assert.deepEqual(
        EthQuery.prototype.estimateGas.getCall(0).args[0],
        Object.assign({ data: 'mockData' }, baseExpectedCall)
      )
      assert.equal(result, 'mockToString:16')
    })

    it('should call ethQuery.estimateGas with data if data is passed', async () => {
      const result = await estimateGas(Object.assign({ data: 'mockData' }, baseMockParams))
      assert.equal(EthQuery.prototype.estimateGas.callCount, 1)
      assert.deepEqual(
        EthQuery.prototype.estimateGas.getCall(0).args[0],
        Object.assign({ data: 'mockData' }, baseExpectedCall)
      )
      assert.equal(result, 'mockToString:16')
    })

    it(`should return ${SIMPLE_GAS_COST} if ethQuery.getCode does not return '0x'`, async () => {
      assert.equal(EthQuery.prototype.estimateGas.callCount, 0)
      const result = await estimateGas(Object.assign({}, baseMockParams, { to: '0x123' }))
      assert.equal(result, SIMPLE_GAS_COST)
    })
  })

  describe('estimateGasPriceFromRecentBlocks', () => {
    const ONE_GWEI_IN_WEI_HEX_PLUS_ONE = addCurrencies(ONE_GWEI_IN_WEI_HEX, '0x1', {
      aBase: 16,
      bBase: 16,
      toNumericBase: 'hex',
    })
    const ONE_GWEI_IN_WEI_HEX_PLUS_TWO = addCurrencies(ONE_GWEI_IN_WEI_HEX, '0x2', {
      aBase: 16,
      bBase: 16,
      toNumericBase: 'hex',
    })
    const ONE_GWEI_IN_WEI_HEX_MINUS_ONE = subtractCurrencies(ONE_GWEI_IN_WEI_HEX, '0x1', {
      aBase: 16,
      bBase: 16,
      toNumericBase: 'hex',
    })

    it(`should return ${ONE_GWEI_IN_WEI_HEX} if recentBlocks is falsy`, () => {
      assert.equal(estimateGasPriceFromRecentBlocks(), ONE_GWEI_IN_WEI_HEX)
    })

    it(`should return ${ONE_GWEI_IN_WEI_HEX} if recentBlocks is empty`, () => {
      assert.equal(estimateGasPriceFromRecentBlocks([]), ONE_GWEI_IN_WEI_HEX)
    })

    it(`should estimate a block's gasPrice as ${ONE_GWEI_IN_WEI_HEX} if it has no gas prices`, () => {
      const mockRecentBlocks = [
        { gasPrices: null },
        { gasPrices: [ ONE_GWEI_IN_WEI_HEX_PLUS_ONE ] },
        { gasPrices: [ ONE_GWEI_IN_WEI_HEX_MINUS_ONE ] },
      ]
      assert.equal(estimateGasPriceFromRecentBlocks(mockRecentBlocks), ONE_GWEI_IN_WEI_HEX)
    })

    it(`should estimate a block's gasPrice as ${ONE_GWEI_IN_WEI_HEX} if it has empty gas prices`, () => {
      const mockRecentBlocks = [
        { gasPrices: [] },
        { gasPrices: [ ONE_GWEI_IN_WEI_HEX_PLUS_ONE ] },
        { gasPrices: [ ONE_GWEI_IN_WEI_HEX_MINUS_ONE ] },
      ]
      assert.equal(estimateGasPriceFromRecentBlocks(mockRecentBlocks), ONE_GWEI_IN_WEI_HEX)
    })

    it(`should return the middle value of all blocks lowest prices`, () => {
      const mockRecentBlocks = [
        { gasPrices: [ ONE_GWEI_IN_WEI_HEX_PLUS_TWO ] },
        { gasPrices: [ ONE_GWEI_IN_WEI_HEX_MINUS_ONE ] },
        { gasPrices: [ ONE_GWEI_IN_WEI_HEX_PLUS_ONE ] },
      ]
      assert.equal(estimateGasPriceFromRecentBlocks(mockRecentBlocks), ONE_GWEI_IN_WEI_HEX_PLUS_ONE)
    })

    it(`should work if a block has multiple gas prices`, () => {
      const mockRecentBlocks = [
        { gasPrices: [ '0x1', '0x2', '0x3', '0x4', '0x5' ] },
        { gasPrices: [ '0x101', '0x100', '0x103', '0x104', '0x102' ] },
        { gasPrices: [ '0x150', '0x50', '0x100', '0x200', '0x5' ] },
      ]
      assert.equal(estimateGasPriceFromRecentBlocks(mockRecentBlocks), '0x5')
    })
  })
})
