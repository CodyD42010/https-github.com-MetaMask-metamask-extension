import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Icon, IconName, IconSize } from '../../component-library';
import { DISCLOSURE_TYPES } from './disclosure.constants';

/**
 * @param {string} type
 * @param {string} title
 * @returns {JSX.Element}
 */
const renderSummaryByType = (type, title) => {
  switch (type) {
    case DISCLOSURE_TYPES.ARROW:
      return (
        <summary className="disclosure__summary is-arrow">
          {title}
          <Icon
            className="disclosure__summary--icon"
            name={IconName.ArrowUp}
            size={IconSize.Sm}
            marginInlineStart={2}
          />
        </summary>
      );
    default:
      return (
        <summary className="disclosure__summary">
          <Icon
            className="disclosure__summary--icon"
            name={IconName.Add}
            size={IconSize.Sm}
            marginInlineEnd={2}
          />
          {title}
        </summary>
      );
  }
};

const Disclosure = ({ children, title, size, type }) => {
  const disclosureFooterEl = useRef(null);
  const [open, setOpen] = useState(false);

  const scrollToBottom = () => {
    disclosureFooterEl &&
      disclosureFooterEl.current &&
      disclosureFooterEl.current.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [open]);

  return (
    <div className="disclosure" onClick={() => setOpen((state) => !state)}>
      {title ? (
        <details>
          {renderSummaryByType(type, title)}

          <div className={classnames('disclosure__content', size)}>
            {children}
          </div>
          <div ref={disclosureFooterEl} className="disclosure__footer"></div>
        </details>
      ) : (
        children
      )}
    </div>
  );
};

Disclosure.propTypes = {
  children: PropTypes.node.isRequired,
  size: PropTypes.string,
  title: PropTypes.string,
  type: PropTypes.string,
};

Disclosure.defaultProps = {
  size: 'normal',
  title: null,
  type: DISCLOSURE_TYPES.DEFAULT,
};

export default Disclosure;
