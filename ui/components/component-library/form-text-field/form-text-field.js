import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import {
  DISPLAY,
  FLEX_DIRECTION,
  Size,
} from '../../../helpers/constants/design-system';

import Box from '../../ui/box/box';

import { TextField } from '../text-field';
import { HelpText } from '../help-text';
import { Label } from '../label';

export const FormTextField = ({
  autoComplete,
  autoFocus,
  className,
  defaultValue,
  disabled,
  error,
  helpText,
  helpTextProps,
  id,
  inputProps,
  inputRef,
  label,
  labelProps,
  leftAccessory,
  maxLength,
  name,
  onBlur,
  onChange,
  onFocus,
  placeholder,
  readOnly,
  required,
  rightAccessory,
  size = Size.MD,
  textFieldProps,
  truncate,
  showClearButton,
  clearButtonOnClick,
  clearButtonProps,
  type = 'text',
  value,
  ...props
}) => (
  <Box
    className={classnames(
      'mm-form-text-field',
      { 'mm-form-text-field--disabled': disabled },
      className,
    )}
    display={DISPLAY.FLEX}
    flexDirection={FLEX_DIRECTION.COLUMN}
    {...props}
  >
    {label && (
      <Label
        htmlFor={id}
        required={required}
        disabled={disabled}
        {...labelProps}
      >
        {label}
      </Label>
    )}
    <TextField
      className={classnames(
        'mm-form-text-field__text-field',
        textFieldProps?.className,
      )}
      id={id}
      {...{
        autoComplete,
        autoFocus,
        defaultValue,
        disabled,
        error,
        id,
        inputProps,
        inputRef,
        leftAccessory,
        maxLength,
        name,
        onBlur,
        onChange,
        onFocus,
        placeholder,
        readOnly,
        required,
        rightAccessory,
        showClearButton,
        clearButtonOnClick,
        clearButtonProps,
        size,
        truncate,
        type,
        value,
        ...textFieldProps,
      }}
    />
    {helpText && (
      <HelpText
        className={classnames(
          'mm-form-text-field__help-text',
          helpTextProps?.className,
        )}
        error={error}
        marginTop={1}
        {...helpTextProps}
      >
        {helpText}
      </HelpText>
    )}
  </Box>
);

FormTextField.propTypes = {
  /**
   * An additional className to apply to the form-text-field
   */
  className: PropTypes.string,
  /**
   * The id of the FormTextField
   * Required if label prop exists to ensure accessibility
   *
   * @param {object} props - The props passed to the component.
   * @param {string} propName - The prop name in this case 'id'.
   * @param {string} componentName - The name of the component.
   */
  id: (props, propName, componentName) => {
    if (props.label && !props[propName]) {
      return new Error(
        `If a label prop exists you must provide an ${propName} prop for the label's htmlFor attribute for accessibility. Warning coming from ${componentName} ui/components/component-library/form-text-field/form-text-field.js`,
      );
    }
    return null;
  },
  /**
   * The content of the Label component
   */
  label: PropTypes.string,
  /**
   * Props that are applied to the Label component
   */
  labelProps: PropTypes.object,
  /**
   * The content of the HelpText component
   */
  helpText: PropTypes.string,
  /**
   * Props that are applied to the HelpText component
   */
  helpTextProps: PropTypes.object,
  /**
   * Props that are applied to the TextField component
   */
  textFieldProps: PropTypes.object,
  /**
   * FormTextField accepts all the props from TextField and Box
   */
  ...TextField.propTypes,
};
