import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { useSelector } from 'react-redux';
import {
  TextColor,
  IconColor,
  AlignItems,
  DISPLAY,
  JustifyContent,
  Size,
} from '../../../../helpers/constants/design-system';
import { getSnapName } from '../../../../helpers/utils/util';
import {
  AvatarFavicon,
  BadgeWrapper,
  BadgeWrapperPosition,
  ICON_NAMES,
  ICON_SIZES,
  AvatarIcon,
  AvatarBase,
} from '../../../component-library';
import { getTargetSubjectMetadata } from '../../../../selectors';

const SnapAvatar = ({ snapId, className }) => {
  const subjectMetadata = useSelector((state) =>
    getTargetSubjectMetadata(state, snapId),
  );

  const friendlyName = snapId && getSnapName(snapId, subjectMetadata);

  const iconUrl = subjectMetadata?.iconUrl;

  const fallbackIcon = friendlyName && friendlyName[0] ? friendlyName[0] : '?';

  return (
    <BadgeWrapper
      className={classnames('snap-avatar', className)}
      badge={
        <AvatarIcon
          iconName={ICON_NAMES.SNAPS}
          size={ICON_SIZES.XS}
          backgroundColor={IconColor.infoDefault}
          iconProps={{
            size: ICON_SIZES.XS,
            color: IconColor.infoInverse,
          }}
        />
      }
      position={BadgeWrapperPosition.bottomRight}
    >
      {iconUrl ? (
        <AvatarFavicon size={Size.LG} src={iconUrl} />
      ) : (
        <AvatarBase
          size={Size.LG}
          display={DISPLAY.FLEX}
          alignItems={AlignItems.center}
          justifyContent={JustifyContent.center}
          color={TextColor.textAlternative}
          style={{ borderWidth: '0px' }}
        >
          {fallbackIcon}
        </AvatarBase>
      )}
    </BadgeWrapper>
  );
};

SnapAvatar.propTypes = {
  /**
   * The id of the snap
   */
  snapId: PropTypes.string,
  /**
   * The className of the SnapAvatar
   */
  className: PropTypes.string,
};

export default SnapAvatar;
