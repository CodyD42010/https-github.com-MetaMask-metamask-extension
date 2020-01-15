import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { inherits } from 'util'
import { connect } from 'react-redux'
import BigNumber from 'bignumber.js'
import * as actions from '../../../store/actions'
import GasModalCard from './gas-modal-card'
import Button from '../../ui/button'

import ethUtil from 'ethereumjs-util'

import { updateSendErrors } from '../../../ducks/send/send.duck'

import {
  MIN_GAS_PRICE_DEC,
  MIN_GAS_LIMIT_DEC,
  MIN_GAS_PRICE_GWEI,
} from '../../../pages/send/send.constants'
import { isBalanceSufficient } from '../../../pages/send/send.utils'

import {
  conversionUtil,
  multiplyCurrencies,
  conversionGreaterThan,
  conversionMax,
  subtractCurrencies,
} from '../../../helpers/utils/conversion-util'

import {
  getGasIsLoading,
  getForceGasMin,
  conversionRateSelector,
  getSendAmount,
  getSelectedToken,
  getSendFrom,
  getCurrentAccountWithSendEtherInfo,
  getSelectedTokenToFiatRate,
  getSendMaxModeState,
} from '../../../selectors/selectors'

import { getGasPrice, getGasLimit } from '../../../pages/send/send.selectors'

function mapStateToProps (state) {
  const selectedToken = getSelectedToken(state)
  const currentAccount =
    getSendFrom(state) || getCurrentAccountWithSendEtherInfo(state)
  const conversionRate = conversionRateSelector(state)

  return {
    gasPrice: getGasPrice(state),
    gasLimit: getGasLimit(state),
    gasIsLoading: getGasIsLoading(state),
    forceGasMin: getForceGasMin(state),
    conversionRate,
    amount: getSendAmount(state),
    maxModeOn: getSendMaxModeState(state),
    balance: currentAccount.balance,
    primaryCurrency: selectedToken && selectedToken.symbol,
    selectedToken,
    amountConversionRate: selectedToken
      ? getSelectedTokenToFiatRate(state)
      : conversionRate,
  }
}

function mapDispatchToProps (dispatch) {
  return {
    hideModal: () => dispatch(actions.hideModal()),
    setGasPrice: newGasPrice => dispatch(actions.setGasPrice(newGasPrice)),
    setGasLimit: newGasLimit => dispatch(actions.setGasLimit(newGasLimit)),
    setGasTotal: newGasTotal => dispatch(actions.setGasTotal(newGasTotal)),
    updateSendAmount: newAmount =>
      dispatch(actions.updateSendAmount(newAmount)),
    updateSendErrors: error => dispatch(updateSendErrors(error)),
  }
}

function getFreshState (props) {
  const gasPrice = props.gasPrice || MIN_GAS_PRICE_DEC
  const gasLimit = props.gasLimit || MIN_GAS_LIMIT_DEC

  const gasTotal = multiplyCurrencies(gasLimit, gasPrice, {
    toNumericBase: 'hex',
    multiplicandBase: 16,
    multiplierBase: 16,
  })

  return {
    gasPrice,
    gasLimit,
    gasTotal,
    error: null,
    priceSigZeros: '',
    priceSigDec: '',
  }
}

inherits(CustomizeGasModal, Component)
function CustomizeGasModal (props) {
  Component.call(this)

  const originalState = getFreshState(props)
  this.state = {
    ...originalState,
    originalState,
  }
}

CustomizeGasModal.contextTypes = {
  t: PropTypes.func,
  metricsEvent: PropTypes.func,
}

export default connect(mapStateToProps, mapDispatchToProps)(CustomizeGasModal)

CustomizeGasModal.prototype.UNSAFE_componentWillReceiveProps = function (
  nextProps
) {
  const currentState = getFreshState(this.props)
  const { gasPrice: currentGasPrice, gasLimit: currentGasLimit } = currentState
  const newState = getFreshState(nextProps)
  const {
    gasPrice: newGasPrice,
    gasLimit: newGasLimit,
    gasTotal: newGasTotal,
  } = newState
  const gasPriceChanged = currentGasPrice !== newGasPrice
  const gasLimitChanged = currentGasLimit !== newGasLimit

  if (gasPriceChanged) {
    this.setState({
      gasPrice: newGasPrice,
      gasTotal: newGasTotal,
      priceSigZeros: '',
      priceSigDec: '',
    })
  }
  if (gasLimitChanged) {
    this.setState({ gasLimit: newGasLimit, gasTotal: newGasTotal })
  }
  if (gasLimitChanged || gasPriceChanged) {
    this.validate({ gasLimit: newGasLimit, gasTotal: newGasTotal })
  }
}

CustomizeGasModal.prototype.save = function (gasPrice, gasLimit, gasTotal) {
  const { metricsEvent } = this.context
  const {
    setGasPrice,
    setGasLimit,
    hideModal,
    setGasTotal,
    maxModeOn,
    selectedToken,
    balance,
    updateSendAmount,
    updateSendErrors,
  } = this.props
  const { originalState } = this.state

  if (maxModeOn && !selectedToken) {
    const maxAmount = subtractCurrencies(
      ethUtil.addHexPrefix(balance),
      ethUtil.addHexPrefix(gasTotal),
      { toNumericBase: 'hex' }
    )
    updateSendAmount(maxAmount)
  }

  metricsEvent({
    eventOpts: {
      category: 'Activation',
      action: 'userCloses',
      name: 'closeCustomizeGas',
    },
    pageOpts: {
      section: 'customizeGasModal',
      component: 'customizeGasSaveButton',
    },
    customVariables: {
      gasPriceChange: new BigNumber(ethUtil.addHexPrefix(gasPrice))
        .minus(new BigNumber(ethUtil.addHexPrefix(originalState.gasPrice)))
        .toString(10),
      gasLimitChange: new BigNumber(ethUtil.addHexPrefix(gasLimit))
        .minus(new BigNumber(ethUtil.addHexPrefix(originalState.gasLimit)))
        .toString(10),
    },
  })

  setGasPrice(ethUtil.addHexPrefix(gasPrice))
  setGasLimit(ethUtil.addHexPrefix(gasLimit))
  setGasTotal(ethUtil.addHexPrefix(gasTotal))
  updateSendErrors({ insufficientFunds: false })
  hideModal()
}

CustomizeGasModal.prototype.revert = function () {
  this.setState(this.state.originalState)
}

CustomizeGasModal.prototype.validate = function ({ gasTotal, gasLimit }) {
  const {
    amount,
    balance,
    selectedToken,
    amountConversionRate,
    conversionRate,
    maxModeOn,
  } = this.props

  let error = null

  const balanceIsSufficient = isBalanceSufficient({
    amount: selectedToken || maxModeOn ? '0' : amount,
    gasTotal,
    balance,
    selectedToken,
    amountConversionRate,
    conversionRate,
  })

  if (!balanceIsSufficient) {
    error = this.context.t('balanceIsInsufficientGas')
  }

  const gasLimitTooLow =
    gasLimit &&
    conversionGreaterThan(
      {
        value: MIN_GAS_LIMIT_DEC,
        fromNumericBase: 'dec',
        conversionRate,
      },
      {
        value: gasLimit,
        fromNumericBase: 'hex',
      }
    )

  if (gasLimitTooLow) {
    error = this.context.t('gasLimitTooLow')
  }

  this.setState({ error })
  return error
}

CustomizeGasModal.prototype.convertAndSetGasLimit = function (newGasLimit) {
  const { gasPrice } = this.state

  const gasLimit = conversionUtil(newGasLimit, {
    fromNumericBase: 'dec',
    toNumericBase: 'hex',
  })

  const gasTotal = multiplyCurrencies(gasLimit, gasPrice, {
    toNumericBase: 'hex',
    multiplicandBase: 16,
    multiplierBase: 16,
  })

  this.validate({ gasTotal, gasLimit })

  this.setState({ gasTotal, gasLimit })
}

CustomizeGasModal.prototype.convertAndSetGasPrice = function (newGasPrice) {
  const { gasLimit } = this.state
  const sigZeros = String(newGasPrice).match(/^\d+[.]\d*?(0+)$/)
  const sigDec = String(newGasPrice).match(/^\d+([.])0*$/)

  this.setState({
    priceSigZeros: (sigZeros && sigZeros[1]) || '',
    priceSigDec: (sigDec && sigDec[1]) || '',
  })

  const gasPrice = conversionUtil(newGasPrice, {
    fromNumericBase: 'dec',
    toNumericBase: 'hex',
    fromDenomination: 'GWEI',
    toDenomination: 'WEI',
  })

  const gasTotal = multiplyCurrencies(gasLimit, gasPrice, {
    toNumericBase: 'hex',
    multiplicandBase: 16,
    multiplierBase: 16,
  })

  this.validate({ gasTotal })

  this.setState({ gasTotal, gasPrice })
}

CustomizeGasModal.prototype.render = function () {
  const { hideModal, forceGasMin, gasIsLoading } = this.props
  const {
    gasPrice,
    gasLimit,
    gasTotal,
    error,
    priceSigZeros,
    priceSigDec,
  } = this.state

  let convertedGasPrice = conversionUtil(gasPrice, {
    fromNumericBase: 'hex',
    toNumericBase: 'dec',
    fromDenomination: 'WEI',
    toDenomination: 'GWEI',
  })

  convertedGasPrice += convertedGasPrice.match(/[.]/)
    ? priceSigZeros
    : `${priceSigDec}${priceSigZeros}`

  let newGasPrice = gasPrice
  if (forceGasMin) {
    const convertedMinPrice = conversionUtil(forceGasMin, {
      fromNumericBase: 'hex',
      toNumericBase: 'dec',
    })
    convertedGasPrice = conversionMax(
      { value: convertedMinPrice, fromNumericBase: 'dec' },
      { value: convertedGasPrice, fromNumericBase: 'dec' }
    )
    newGasPrice = conversionMax(
      { value: gasPrice, fromNumericBase: 'hex' },
      { value: forceGasMin, fromNumericBase: 'hex' }
    )
  }

  const convertedGasLimit = conversionUtil(gasLimit, {
    fromNumericBase: 'hex',
    toNumericBase: 'dec',
  })

  if (gasIsLoading) {
    return null
  }

  const { t } = this.context

  return (
    <div className="send-v2__customize-gas">
      <div className="send-v2__customize-gas__content">
        <div className="send-v2__customize-gas__header">
          <div className="send-v2__customize-gas__title">
            {this.context.t('customGas')}
          </div>
          <div className="send-v2__customize-gas__close" onClick={hideModal} />
        </div>
        <div className="send-v2__customize-gas__body">
          <GasModalCard
            value={convertedGasPrice}
            min={forceGasMin || MIN_GAS_PRICE_GWEI}
            step={1}
            onChange={value => this.convertAndSetGasPrice(value)}
            title={t('gasPrice')}
            copy={t('gasPriceCalculation')}
            gasIsLoading={gasIsLoading}
          />
          <GasModalCard
            value={convertedGasLimit}
            min={1}
            step={1}
            onChange={value => this.convertAndSetGasLimit(value)}
            title={t('gasLimit')}
            copy={t('gasLimitCalculation')}
            gasIsLoading={gasIsLoading}
          />
        </div>
        <div className="send-v2__customize-gas__footer">
          {error && (
            <div className="send-v2__customize-gas__error-message">{error}</div>
          )}
          <div
            className="send-v2__customize-gas__revert"
            onClick={() => this.revert()}
          >
            {t('revert')}
          </div>
          <div className="send-v2__customize-gas__buttons">
            <Button
              type="default"
              className="send-v2__customize-gas__cancel"
              onClick={hideModal}
            >
              {t('cancel')}
            </Button>
            <Button
              type="secondary"
              className="send-v2__customize-gas__save"
              onClick={() =>
                !error && this.save(newGasPrice, gasLimit, gasTotal)
              }
              disabled={error}
            >
              {t('save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
