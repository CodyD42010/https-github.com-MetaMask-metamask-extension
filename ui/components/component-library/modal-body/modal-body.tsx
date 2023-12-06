import React from 'react';
import classnames from 'classnames';

import { Box } from '..';
import type { PolymorphicRef, BoxProps } from '../box';

import { ModalBodyProps, ModalBodyComponent } from './modal-body.types';

export const ModalBody: ModalBodyComponent = React.forwardRef(
  <C extends React.ElementType = 'div'>(
    { className = '', children, ...props }: ModalBodyProps<C>,
    ref?: PolymorphicRef<C>,
  ) => (
    <Box
      className={classnames('mm-modal-body', className)}
      paddingLeft={4}
      paddingRight={4}
      paddingBottom={2}
      paddingTop={2}
      ref={ref}
      {...(props as BoxProps<C>)}
    >
      {children}
    </Box>
  ),
);

export default ModalBody;
