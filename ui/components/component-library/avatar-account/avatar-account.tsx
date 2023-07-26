import React from 'react';
import classnames from 'classnames';
import Jazzicon from '../../ui/jazzicon/jazzicon.component';
import BlockieIdenticon from '../../ui/identicon/blockieIdenticon/blockieIdenticon.component';

import type { PolymorphicRef, BoxProps } from '../box';

import { AvatarBase } from '../avatar-base';
import {
  AvatarAccountDiameter,
  AvatarAccountVariant,
  AvatarAccountSize,
  AvatarAccountComponent,
  AvatarAccountProps,
} from './avatar-account.types';

export const AvatarAccount: AvatarAccountComponent = React.forwardRef(
  <C extends React.ElementType = 'div'>(
    {
      size = AvatarAccountSize.Md,
      address,
      className = '',
      variant = AvatarAccountVariant.Jazzicon,
      ...props
    }: AvatarAccountProps<C>,
    ref?: PolymorphicRef<C>,
  ) => (
    <AvatarBase
      ref={ref}
      size={size}
      className={classnames('mm-avatar-account', className)}
      {...(props as BoxProps<C>)}
    >
      {variant === AvatarAccountVariant.Jazzicon ? (
        <Jazzicon
          className={classnames('mm-avatar-account__jazzicon')}
          address={address}
          diameter={AvatarAccountDiameter[size]}
        />
      ) : (
        <BlockieIdenticon
          address={address}
          diameter={AvatarAccountDiameter[size]}
          borderRadius="50%"
        />
      )}
    </AvatarBase>
  ),
);
