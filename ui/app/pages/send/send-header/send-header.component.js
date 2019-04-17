import React, { Component } from 'react'
import PropTypes from 'prop-types'
import PageContainerHeader from '../../../components/ui/page-container/page-container-header'
import { DEFAULT_ROUTE } from '../../../helpers/constants/routes'

export default class SendHeader extends Component {

  static propTypes = {
    clearSend: PropTypes.func,
    history: PropTypes.object,
    titleKey: PropTypes.string,
    subtitleParams: PropTypes.array,
  };

  static contextTypes = {
    t: PropTypes.func,
  };

  onClose () {
    this.props.clearSend()
    this.props.history.push(DEFAULT_ROUTE)
  }

  render () {
    return (
      <PageContainerHeader
        onClose={() => this.onClose()}
        title={this.context.t(this.props.titleKey)}
      />
    )
  }

}
