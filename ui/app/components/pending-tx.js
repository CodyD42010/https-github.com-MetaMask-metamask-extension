const Component = require('react').Component
const connect = require('react-redux').connect
const h = require('react-hyperscript')
const inherits = require('util').inherits
const PendingTxDetails = require('./pending-tx-details')
const extend = require('xtend')
const actions = require('../actions')

module.exports = connect(mapStateToProps)(PendingTx)

function mapStateToProps (state) {
  return {

  }
}

inherits(PendingTx, Component)
function PendingTx () {
  Component.call(this)
}

PendingTx.prototype.render = function () {
  const props = this.props
  const newProps = extend(props, {ref: 'details'})
  const txData = props.txData

  return (

    h('div', {
      key: txData.id,
    }, [

      // tx info
      h(PendingTxDetails, newProps),

      h('style', `
        .conf-buttons button {
          margin-left: 10px;
          text-transform: uppercase;
        }
      `),

      txData.simulationFails ?
        h('.error', {
          style: {
            marginLeft: 50,
            fontSize: '0.9em',
          },
        }, 'Transaction Error. Exception thrown in contract code.')
      : null,

      props.insufficientBalance ?
        h('span.error', {
          style: {
            marginLeft: 50,
            fontSize: '0.9em',
          },
        }, 'Insufficient balance for transaction')
      : null,

      // send + cancel
      h('.flex-row.flex-space-around.conf-buttons', {
        style: {
          display: 'flex',
          justifyContent: 'flex-end',
          margin: '14px 25px',
        },
      }, [

        props.insufficientBalance ?
          h('button', {
            onClick: props.buyEth,
          }, 'Buy Ether')
        : null,

        h('button', {
          onClick: () => {
            this.refs.details.resetGasFields()
          },
        }, 'Reset'),

        h('button.confirm.btn-green', {
          disabled: props.insufficientBalance,
          onClick: (txData, event) => {
            if (this.refs.details.verifyGasParams()) {
              props.sendTransaction(txData, event)
            } else {
              this.props.dispatch(actions.displayWarning('Invalid Gas Parameters'))
            }
          },
        }, 'Accept'),

        h('button.cancel.btn-red', {
          onClick: props.cancelTransaction,
        }, 'Reject'),
      ]),
    ])
  )
}
