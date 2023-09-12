import type {
  PolymorphicComponentPropWithRef,
  StyleUtilityProps,
} from '../box';
import { IconProps } from '../icon/icon.types';
import { AvatarNetworkProps } from '../avatar-network/avatar-network.types';
import {
  BackgroundColor,
  TextColor,
} from '../../../helpers/constants/design-system';

export interface PickerNetworkStyleUtilityProps extends StyleUtilityProps {
  /**
   * The src accepts the string of the image to be rendered
   */
  src?: string;
  /**
   * An additional className to apply to the PickerNetwork.
   */
  className?: string;
  /**
   * It accepts all the props from AvatarNetwork
   */
  avatarNetworkProps?: AvatarNetworkProps<'span'>;
  /**
   * It accepts all the props from Icon
   */
  iconProps?: IconProps<'span'>;
  /**
   * The text content of the PickerNetwork component
   */
  label: string;
  /**
   * The text color of the label in PickerNetwork component
   */
  labelColor?: TextColor;
  /**
   * The background color of the whole container
   */
  backgroundColor?: BackgroundColor;
}

export type PickerNetworkProps<C extends React.ElementType> =
  PolymorphicComponentPropWithRef<C, PickerNetworkStyleUtilityProps>;

export type PickerNetworkComponent = <C extends React.ElementType = 'button'>(
  props: PickerNetworkProps<C>,
) => React.ReactElement | null;
