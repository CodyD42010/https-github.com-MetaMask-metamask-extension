import type {
  StyleUtilityProps,
  PolymorphicComponentPropWithRef,
} from '../box';
import { IconProps } from '../icon';

export enum SelectButtonSize {
  Sm = 'sm',
  Md = 'md',
  Lg = 'lg',
}

export interface SelectButtonStyleUtilityProps extends StyleUtilityProps {
  /*
   * Additional classNames to be added to the SelectButton component
   */
  className?: string;
  /**
   * The size of the SelectButton using SelectButtonSize enum
   * Possible values: 'SelectButtonSize.Sm', 'SelectButtonSize.Md', 'SelectButtonSize.Lg'
   */
  size?: SelectButtonSize;
  /*
   * Placeholder for SelectButton component
   */
  placeholder?: any;
  isBlock?: boolean;
  isDanger?: boolean;
  isDisabled?: boolean;
  caretIconProps?: IconProps<'span'>;
  label?: string | React.ReactNode;
  description?: string | React.ReactNode;
}

export type SelectButtonProps<C extends React.ElementType> =
  PolymorphicComponentPropWithRef<C, SelectButtonStyleUtilityProps>;

export type SelectButtonComponent = <C extends React.ElementType = 'div'>(
  props: SelectButtonProps<C>,
) => React.ReactElement | null;
