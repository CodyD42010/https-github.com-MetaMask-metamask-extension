import { connect } from 'react-redux'
import { compose } from 'recompose'
import { withRouter } from 'react-router-dom'
import PermissionPageContainer from './permission-page-container.component'
import {
  getPermissionsDescriptions,
  getDomainMetadata,
} from '../../../selectors/selectors'

const mapStateToProps = (state, ownProps) => {
  const { request } = ownProps
  const { metadata: requestMetadata = {} } = request || {}

  const domainMetadata = getDomainMetadata(state)
  const targetDomainMetadata = (
    domainMetadata[requestMetadata.origin] ||
    { name: requestMetadata.origin, icon: null }
  )

  return {
    permissionsDescriptions: getPermissionsDescriptions(state),
    requestMetadata,
    targetDomainMetadata,
  }
}

export default compose(
  withRouter,
  connect(mapStateToProps)
)(PermissionPageContainer)
