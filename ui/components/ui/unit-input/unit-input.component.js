import React, { PureComponent } from 'react';
import { Tooltip } from 'react-tippy';
import PropTypes from 'prop-types';
import classnames from 'classnames';

const INPUT_HORIZONTAL_PADDING = 4;

function removeLeadingZeroes(str) {
  return str.replace(/^0*(?=\d)/u, '');
}

/**
 * Component that attaches a suffix or unit of measurement trailing user input, ex. 'ETH'. Also
 * allows rendering a child component underneath the input to, for example, display conversions of
 * the shown suffix.
 */
export default class UnitInput extends PureComponent {
  static propTypes = {
    className: PropTypes.string,
    dataTestId: PropTypes.string,
    children: PropTypes.node,
    actionComponent: PropTypes.node,
    error: PropTypes.bool,
    onChange: PropTypes.func,
    onBlur: PropTypes.func,
    placeholder: PropTypes.string,
    suffix: PropTypes.string,
    hideSuffix: PropTypes.bool,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    keyPressRegex: PropTypes.instanceOf(RegExp),
  };

  static defaultProps = {
    value: '',
    placeholder: '0',
  };

  state = {
    value: this.props.value,
    isOverflowing: false,
  };

  componentDidUpdate(prevProps) {
    const { value: prevPropsValue } = prevProps;
    const { value: propsValue } = this.props;
    const { value: stateValue } = this.state;

    if (
      prevPropsValue !== propsValue &&
      Number(propsValue) !== Number(stateValue)
    ) {
      this.setState({ ...this.state, value: propsValue });
    }
  }

  handleFocus = () => {
    this.unitInput.focus();
  };

  handleInputFocus = ({ target: { value } }) => {
    if (value === '0') {
      this.setState({
        ...this.state,
        isOverflowing: false,
        value: '',
      });
    }
  };

  handleInputBlur = ({ target: { value } }) => {
    if (value === '') {
      this.setState({
        ...this.state,
        isOverflowing: false,
        value: '0',
      });
    }

    this.props.onBlur && this.props.onBlur(value);
  };

  handleChange = (event) => {
    const { value: userInput } = event.target;
    let value = userInput;

    if (userInput.length && userInput.length > 1) {
      value = removeLeadingZeroes(userInput);
    }

    this.setState({
      ...this.state,
      isOverflowing: this.getIsOverflowing(),
      value,
    });

    this.props.onChange(value);
  };

  getInputWidth(value) {
    const valueString = String(value);
    const valueLength = valueString.length || 1;
    const decimalPointDeficit = valueString.match(/\./u) ? -0.5 : 0;
    return `${valueLength + decimalPointDeficit + 0.5}ch`;
  }

  getIsOverflowing() {
    let isOverflowing = false;

    if (this.unitInput) {
      const { offsetWidth, scrollWidth } = this.unitInput;

      // overflowing when scrollable width exceeds padding
      isOverflowing = scrollWidth - offsetWidth > INPUT_HORIZONTAL_PADDING;
    }

    return isOverflowing;
  }

  render() {
    const {
      className,
      error,
      placeholder,
      hideSuffix,
      suffix,
      actionComponent,
      children,
      dataTestId,
    } = this.props;
    const { value, isOverflowing } = this.state;

    return (
      <div
        className={classnames(
          'unit-input',
          { 'unit-input--error': error },
          className,
        )}
        onClick={this.handleFocus}
      >
        <div className="unit-input__inputs">
          <Tooltip
            title={value}
            disabled={!isOverflowing}
            arrow
            hideOnClick={false}
            className="unit-input__input-container"
            // explicitly inherit display since Tooltip will default to block
            style={{ display: 'inherit' }}
          >
            <input
              data-testid={dataTestId}
              type="number"
              dir="ltr"
              className={classnames('unit-input__input')}
              value={value}
              placeholder={placeholder}
              onChange={this.handleChange}
              onBlur={this.handleInputBlur}
              onFocus={this.handleInputFocus}
              onKeyPress={(e) =>
                this.props.keyPressRegex &&
                !this.props.keyPressRegex.test(e.key) &&
                e.preventDefault()
              }
              onPaste={(e) =>
                this.props.keyPressRegex &&
                !this.props.keyPressRegex.test(
                  e.clipboardData.getData('Text'),
                ) &&
                e.preventDefault()
              }
              min={0}
              step="any"
              style={{ width: this.getInputWidth(value) }}
              ref={(ref) => {
                this.unitInput = ref;
              }}
              autoFocus
            />
            {suffix && !hideSuffix ? (
              <div className="unit-input__suffix">{suffix}</div>
            ) : null}
          </Tooltip>
          {children}
        </div>
        {actionComponent}
      </div>
    );
  }
}
