import classnames from 'classnames';
import { debounce } from 'lodash';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
} from '../../../../shared/constants/metametrics';
import {
  ///: BEGIN:ONLY_INCLUDE_IF(blockaid)
  NOTIFICATION_BLOCKAID_DEFAULT,
  ///: END:ONLY_INCLUDE_IF
  NOTIFICATION_BUY_SELL_BUTTON,
  NOTIFICATION_DROP_LEDGER_FIREFOX,
  NOTIFICATION_OPEN_BETA_SNAPS,
  NOTIFICATION_PETNAMES,
  NOTIFICATION_U2F_LEDGER_LIVE,
  NOTIFICATION_SMART_TRANSACTIONS,
  getTranslatedUINotifications,
  NOTIFICATION_STAKING_PORTFOLIO,
  NOTIFICATION_PORTFOLIO_V2,
  NOTIFICATION_SIMULATIONS,
} from '../../../../shared/notifications';
import { I18nContext } from '../../../contexts/i18n';
import { MetaMetricsContext } from '../../../contexts/metametrics';
import { getCurrentLocale } from '../../../ducks/locale/locale';
import {
  TextVariant,
  Display,
  FlexDirection,
} from '../../../helpers/constants/design-system';
import { ADVANCED_ROUTE } from '../../../helpers/constants/routes';
import ZENDESK_URLS from '../../../helpers/constants/zendesk-url';
import { useEqualityCheck } from '../../../hooks/useEqualityCheck';
///: BEGIN:ONLY_INCLUDE_IF(blockaid)
import { useTheme } from '../../../hooks/useTheme';
///: END:ONLY_INCLUDE_IF
import {
  getSortedAnnouncementsToShow,
  getSmartTransactionsOptInStatus,
} from '../../../selectors';
import { updateViewedNotifications, setStxOptIn } from '../../../store/actions';
import {
  ButtonPrimary,
  Text,
  Button,
  ButtonVariant,
  Box,
} from '../../component-library';
import Popover from '../../ui/popover';

function getActionFunctionById(id, history) {
  const actionFunctions = {
    8: () => {
      updateViewedNotifications({ 8: true });
      history.push(ADVANCED_ROUTE);
    },
    20: () => {
      updateViewedNotifications({ 20: true });
      global.platform.openTab({
        url: ZENDESK_URLS.LEDGER_FIREFOX_U2F_GUIDE,
      });
    },
    24: () => {
      updateViewedNotifications({ 24: true });
    },
    [NOTIFICATION_DROP_LEDGER_FIREFOX]: () => {
      updateViewedNotifications({ [NOTIFICATION_DROP_LEDGER_FIREFOX]: true });
    },
    [NOTIFICATION_OPEN_BETA_SNAPS]: () => {
      updateViewedNotifications({ [NOTIFICATION_OPEN_BETA_SNAPS]: true });
      global.platform.openTab({
        url: 'https://metamask.io/snaps/',
      });
    },
    [NOTIFICATION_BUY_SELL_BUTTON]: () => {
      updateViewedNotifications({ [NOTIFICATION_BUY_SELL_BUTTON]: true });
      global.platform.openTab({
        url: 'https://portfolio.metamask.io/sell/build-quote',
      });
    },
    [NOTIFICATION_SMART_TRANSACTIONS]: () => {
      updateViewedNotifications({ [NOTIFICATION_SMART_TRANSACTIONS]: true });
    },
    [NOTIFICATION_U2F_LEDGER_LIVE]: () => {
      updateViewedNotifications({ [NOTIFICATION_U2F_LEDGER_LIVE]: true });
    },
    [NOTIFICATION_STAKING_PORTFOLIO]: () => {
      updateViewedNotifications({ [NOTIFICATION_STAKING_PORTFOLIO]: true });
    },
    ///: BEGIN:ONLY_INCLUDE_IF(blockaid)
    [NOTIFICATION_BLOCKAID_DEFAULT]: () => {
      updateViewedNotifications({ [NOTIFICATION_BLOCKAID_DEFAULT]: true });
    },
    ///: END:ONLY_INCLUDE_IF
    [NOTIFICATION_PETNAMES]: () => {
      updateViewedNotifications({ [NOTIFICATION_PETNAMES]: true });
    },
    [NOTIFICATION_PORTFOLIO_V2]: () => {
      updateViewedNotifications({ [NOTIFICATION_PORTFOLIO_V2]: true });
      global.platform.openTab({
        url: 'https://portfolio.metamask.io/',
      });
    },
    [NOTIFICATION_SIMULATIONS]: () => {
      updateViewedNotifications({ [NOTIFICATION_SIMULATIONS]: true });
    },
  };

  return actionFunctions[id];
}

const renderDescription = (description) => {
  if (!Array.isArray(description)) {
    return <Text variant={TextVariant.bodyMd}>{description}</Text>;
  }

  return (
    <>
      {description.map((piece, index) => {
        const isLast = index === description.length - 1;
        return (
          <Text
            data-testid={`whats-new-description-item-${index}`}
            key={`item-${index}`}
            variant={TextVariant.bodyMd}
            marginBottom={isLast ? 0 : 4}
          >
            {piece}
          </Text>
        );
      })}
    </>
  );
};

const renderExtraSection = ({ id, history, t }) => {
  switch (id) {
    case NOTIFICATION_SMART_TRANSACTIONS:
      return (
        <Box
          display={Display.Flex}
          flexDirection={FlexDirection.Column}
          marginBottom={4}
        >
          <Button
            type="link"
            variant={ButtonVariant.Link}
            onClick={() => {
              updateViewedNotifications({
                [NOTIFICATION_SMART_TRANSACTIONS]: true,
              });
              history.push(`${ADVANCED_ROUTE}#smart-transactions`);
            }}
          >
            {t('notificationsStxManageInSettings')}
          </Button>
        </Box>
      );
    default:
      return null;
  }
};

const renderFirstNotification = ({
  notification,
  idRefMap,
  history,
  isLast,
  trackEvent,
  t,
}) => {
  const { id, date, title, description, image, actionText } = notification;
  const actionFunction = getActionFunctionById(id, history);

  const imageComponent = image && (
    <img
      className="whats-new-popup__notification-image"
      src={image.src}
      height={image.height}
      width={image.width}
    />
  );
  const placeImageBelowDescription = image?.placeImageBelowDescription;

  return (
    <div
      className={classnames(
        'whats-new-popup__notification whats-new-popup__first-notification',
        {
          'whats-new-popup__last-notification': isLast,
        },
      )}
      key={`whats-new-popop-notification-${id}`}
    >
      <Text variant={TextVariant.bodyLgMedium} marginBottom={2}>
        {title}
      </Text>
      {!placeImageBelowDescription && imageComponent}
      <div className="whats-new-popup__description-and-date">
        <div className="whats-new-popup__notification-description">
          {renderDescription(description)}
        </div>

        <div className="whats-new-popup__notification-date">{date}</div>
      </div>
      {placeImageBelowDescription && imageComponent}
      {renderExtraSection({
        id,
        history,
        t,
      })}
      {actionText && (
        <ButtonPrimary
          className="whats-new-popup__button"
          onClick={() => {
            actionFunction();
            trackEvent({
              category: MetaMetricsEventCategory.Home,
              event: MetaMetricsEventName.WhatsNewClicked,
            });
          }}
          block
        >
          {actionText}
        </ButtonPrimary>
      )}
      <div
        className="whats-new-popup__intersection-observable"
        ref={idRefMap[id]}
      />
    </div>
  );
};

const renderSubsequentNotification = ({
  notification,
  idRefMap,
  history,
  isLast,
}) => {
  const { id, date, title, description, actionText } = notification;

  const actionFunction = getActionFunctionById(id, history);
  return (
    <div
      className={classnames('whats-new-popup__notification', {
        'whats-new-popup__last-notification': isLast,
      })}
      key={`whats-new-popop-notification-${id}`}
    >
      <div className="whats-new-popup__notification-title">{title}</div>
      <div className="whats-new-popup__description-and-date">
        <div className="whats-new-popup__notification-description">
          {renderDescription(description)}
        </div>
        <div className="whats-new-popup__notification-date">{date}</div>
      </div>
      {actionText && (
        <div className="whats-new-popup__link" onClick={actionFunction}>
          {`${actionText} >`}
        </div>
      )}
      <div
        className="whats-new-popup__intersection-observable"
        ref={idRefMap[id]}
      />
    </div>
  );
};

export default function WhatsNewPopup({ onClose }) {
  const t = useContext(I18nContext);
  const history = useHistory();
  const dispatch = useDispatch();

  const notifications = useSelector(getSortedAnnouncementsToShow);
  const smartTransactionsOptInStatus = useSelector(
    getSmartTransactionsOptInStatus,
  );
  const locale = useSelector(getCurrentLocale);

  ///: BEGIN:ONLY_INCLUDE_IF(blockaid)
  const theme = useTheme();
  ///: END:ONLY_INCLUDE_IF

  const [stxOptInSent, setStxOptInSent] = useState(false);
  const [seenNotifications, setSeenNotifications] = useState({});

  const stxNotification = notifications.find(
    (notification) => notification.id === NOTIFICATION_SMART_TRANSACTIONS,
  );
  if (stxNotification && !smartTransactionsOptInStatus && !stxOptInSent) {
    setStxOptInSent(true);
    dispatch(setStxOptIn(true));
  }

  const [shouldShowScrollButton, setShouldShowScrollButton] = useState(true);

  const popoverRef = useRef();

  const memoizedNotifications = useEqualityCheck(notifications);
  const idRefMap = useMemo(
    () =>
      memoizedNotifications.reduce(
        (_idRefMap, notification) => ({
          ..._idRefMap,
          [notification.id]: React.createRef(),
        }),
        {},
      ),
    [memoizedNotifications],
  );

  const trackEvent = useContext(MetaMetricsContext);

  const handleDebouncedScroll = debounce((target) => {
    setShouldShowScrollButton(
      target.scrollHeight - target.scrollTop !== target.clientHeight,
    );
  }, 100);

  const handleScroll = (e) => {
    handleDebouncedScroll(e.target);
  };

  const handleScrollDownClick = (e) => {
    e.stopPropagation();
    idRefMap[notifications[notifications.length - 1].id].current.scrollIntoView(
      {
        behavior: 'smooth',
      },
    );
  };

  useEffect(() => {
    const observer = new window.IntersectionObserver(
      (entries, _observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const [id, ref] = Object.entries(idRefMap).find(([_, _ref]) =>
              _ref.current.isSameNode(entry.target),
            );

            setSeenNotifications((_seenNotifications) => ({
              ..._seenNotifications,
              [id]: true,
            }));

            _observer.unobserve(ref.current);
          }
        });
      },
      {
        root: popoverRef.current,
        threshold: 1.0,
      },
    );

    Object.values(idRefMap).forEach((ref) => {
      observer.observe(ref.current);
    });

    return () => {
      observer.disconnect();
    };
  }, [idRefMap, setSeenNotifications]);

  // Display notifications with full image
  const notificationRenderers = {
    24: renderFirstNotification,
    // This syntax is unusual, but very helpful here.  It's equivalent to `notificationRenderers[NOTIFICATION_DROP_LEDGER_FIREFOX] =`
    [NOTIFICATION_DROP_LEDGER_FIREFOX]: renderFirstNotification,
    [NOTIFICATION_OPEN_BETA_SNAPS]: renderFirstNotification,
    [NOTIFICATION_BUY_SELL_BUTTON]: renderFirstNotification,
    [NOTIFICATION_SMART_TRANSACTIONS]: renderFirstNotification,
    [NOTIFICATION_U2F_LEDGER_LIVE]: renderFirstNotification,
    [NOTIFICATION_STAKING_PORTFOLIO]: renderFirstNotification,
    ///: BEGIN:ONLY_INCLUDE_IF(blockaid)
    [NOTIFICATION_BLOCKAID_DEFAULT]: renderFirstNotification,
    ///: END:ONLY_INCLUDE_IF
    [NOTIFICATION_PETNAMES]: renderFirstNotification,
    [NOTIFICATION_PORTFOLIO_V2]: renderFirstNotification,
    [NOTIFICATION_SIMULATIONS]: renderFirstNotification,
  };

  return (
    <Popover
      title={t('whatsNew')}
      headerProps={{ padding: [4, 4, 4] }}
      className="whats-new-popup__popover"
      onClose={() => {
        updateViewedNotifications(seenNotifications);
        trackEvent({
          category: MetaMetricsEventCategory.Home,
          event: MetaMetricsEventName.WhatsNewViewed,
          properties: {
            number_viewed: Object.keys(seenNotifications).pop(),
            completed_all: true,
          },
        });
        onClose();
      }}
      popoverRef={popoverRef}
      showScrollDown={shouldShowScrollButton && notifications.length > 1}
      onScrollDownButtonClick={handleScrollDownClick}
      onScroll={handleScroll}
    >
      <div className="whats-new-popup__notifications">
        {notifications.map(({ id }, index) => {
          const notification = getTranslatedUINotifications(
            t,
            locale,

            ///: BEGIN:ONLY_INCLUDE_IF(blockaid)
            theme,
            ///: END:ONLY_INCLUDE_IF
          )[id];
          const isLast = index === notifications.length - 1;
          // Choose the appropriate rendering function based on the id
          const renderNotification =
            notificationRenderers[id] || renderSubsequentNotification;

          return renderNotification({
            notification,
            idRefMap,
            history,
            isLast,
            trackEvent,
            t,
          });
        })}
      </div>
    </Popover>
  );
}

WhatsNewPopup.propTypes = {
  onClose: PropTypes.func.isRequired,
};
