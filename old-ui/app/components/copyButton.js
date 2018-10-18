const Component = require('react').Component
const h = require('react-hyperscript')
const classNames = require('classnames')
const inherits = require('util').inherits
const copyToClipboard = require('copy-to-clipboard')

const Tooltip = require('./tooltip')

module.exports = CopyButton

inherits(CopyButton, Component)
function CopyButton () {
  Component.call(this)
}

// As parameters, accepts:
// "value", which is the value to copy (mandatory)
// "title", which is the text to show on hover (optional, defaults to 'Copy')
CopyButton.prototype.render = function () {
  const props = this.props
  const state = this.state || {}

  const value = props.value
  const display = props.display
  const copied = state.copied

  const message = copied ? 'Copied' : props.title || ' Copy '
  const defaultCopyStyles = ['clipboard', 'cursor-pointer']

  return h('.copy-button', {
    style: {
      display: display || 'flex',
      alignItems: 'center',
    },
  }, [
    h(Tooltip, {
      title: message,
    }, [
      h('i', {
        style: {
          marginLeft: '5px',
        },
        className: classNames(defaultCopyStyles, {white: props.isWhite}),
        onClick: (event) => {
          event.preventDefault()
          event.stopPropagation()
          copyToClipboard(value)
          this.debounceRestore()
        },
      }),
    ]),

  ])
}

CopyButton.prototype.debounceRestore = function () {
  this.setState({ copied: true })
  clearTimeout(this.timeout)
  this.timeout = setTimeout(() => {
    this.setState({ copied: false })
  }, 850)
}
