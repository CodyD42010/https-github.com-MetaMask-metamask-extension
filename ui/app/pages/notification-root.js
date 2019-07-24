import React from 'react'
import PropTypes from 'prop-types'
import NotificationRoutes from './routes/notification-routes'
import Root from './root'

const NotificationRoot = (props) => {
  const { store } = props

  return (
    <Root store={store}>
      <NotificationRoutes />
    </Root>
  )
}

NotificationRoot.propTypes = {
  store: PropTypes.object,
}

export default NotificationRoot
