import { connect } from 'react-redux'
import PermissionPageContainer from './permission-page-container.component'
import {
  getTargetDomainMetadata,
  getMetaMaskIdentities,
} from '../../../selectors'

const mapStateToProps = (state, ownProps) => {
  const { request, cachedOrigin, selectedIdentities } = ownProps
  const targetDomainMetadata = getTargetDomainMetadata(state, request, cachedOrigin)

  const allIdentities = getMetaMaskIdentities(state)
  const allIdentitiesSelected = Object.keys(selectedIdentities).length === Object.keys(allIdentities).length && selectedIdentities.length > 1

  return {
    targetDomainMetadata,
    allIdentitiesSelected,
  }
}

export default connect(mapStateToProps)(PermissionPageContainer)
