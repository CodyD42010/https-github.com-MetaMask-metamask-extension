import * as React from 'react';
import classnames from 'classnames';
import {
  Text,
  Box,
  AvatarToken,
  AvatarTokenSize,
} from '../../component-library';
import {
  AlignItems,
  BorderRadius,
  Display,
} from '../../../helpers/constants/design-system';
import { AvatarGroupProps } from './avatar-group.types';

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  className = '',
  limit = 4,
  members = [],
  size = AvatarTokenSize.Sm,
}): JSX.Element => {
  const membersCount = members.length;
  const visibleMembers = members.slice(0, limit);
  const showTag = membersCount > limit;
  let marginLeftValue = '';
  if (AvatarTokenSize.Xs) {
    marginLeftValue = '-8px';
  } else if (AvatarTokenSize.Sm) {
    marginLeftValue = '-12px';
  } else {
    marginLeftValue = '-16px';
  }
  const tagValue = `+${(membersCount - limit).toLocaleString()}`;
  return (
    <Box
      alignItems={AlignItems.center}
      display={Display.Flex}
      className={classnames('multichain-avatar-group', className)}
    >
      <Box display={Display.Flex}>
        {visibleMembers.map((x, i) => (
          <Box
            borderRadius={BorderRadius.full}
            key={x.label}
            style={
              i === 0 ? { marginLeft: '0px' } : { marginLeft: marginLeftValue }
            }
          >
            <AvatarToken src={x.src} name={x.label} size={size} />
          </Box>
        ))}
      </Box>
      {showTag ? (
        <Box>
          {typeof tagValue === 'string' ? <Text>{tagValue}</Text> : tagValue}
        </Box>
      ) : null}
    </Box>
  );
};
