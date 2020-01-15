import React, { Component } from 'react'
import { inherits } from 'util'

export default ReadOnlyInput

inherits(ReadOnlyInput, Component)
function ReadOnlyInput () {
  Component.call(this)
}

ReadOnlyInput.prototype.render = function ReadOnlyInput () {
  const {
    wrapperClass = '',
    inputClass = '',
    value,
    textarea,
    onClick,
  } = this.props

  const InputType = textarea ? 'textarea' : 'input'

  return (
    <div className={wrapperClass}>
      <InputType
        className={inputClass}
        value={value}
        readOnly
        onFocus={event => event.target.select()}
        onClick={onClick}
      />
    </div>
  )
}
