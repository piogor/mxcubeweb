import { Dropdown } from 'react-bootstrap';

import TooltipTrigger from '../TooltipTrigger';
import styles from './NStateSelect.module.css';

const VARIANT_CLASSES = {
  danger: styles.danger,
  info: styles.info,
  warning: styles.warning,
};

/**
 * @typedef {Object} NStateOption
 * @property {string} value - Canonical value sent to the backend.
 * @property {string} [label] - Display text; defaults to `value` if omitted.
 * @property {string} [description] - Short note shown in small font under the
 *   label and colored per `variant`.
 * @property {'info' | 'warning' | 'danger'} [variant] - Visual
 *   styling for the option.
 */

/**
 * @param {string | NStateOption} option
 * @returns {NStateOption}
 */
function normalizeOption(option) {
  return typeof option === 'string' ? { value: option } : option;
}

/**
 * Select-type input for hardware objects with discrete states, e.g.
 * ones accessed with NStateAdapter.
 *
 * @typedef {Object} Props
 * @property {string} id - DOM id for the toggle element.
 * @property {string} value - Currently selected value.
 * @property {(string | NStateOption)[]} options - Selectable values shown in
 *   the dropdown. Strings render plainly; objects allow per-option label,
 *   description and variant.
 * @property {boolean} isBusy - Whether the hardware is busy.
 * @property {(value: string) => void} onSelect - Called with the new value on user change.
 * @property {string} [tooltip] - Hover tooltip text for the select as a whole.
 *
 * @param {Props} props
 */
export function NStateSelect({
  id,
  value,
  options,
  isBusy,
  onSelect,
  tooltip,
}) {
  const normalizedOptions = options.map(normalizeOption);

  const selected = normalizedOptions.find(
    (option) => option.value === value,
  ) ?? {
    value,
  };

  return (
    <Dropdown onSelect={(key) => key !== null && onSelect(key)}>
      <TooltipTrigger id={`${id}-tooltip`} tooltipContent={tooltip}>
        <Dropdown.Toggle
          id={id}
          variant="light"
          className={styles.select}
          data-state={isBusy ? 'busy' : 'ready'}
          disabled={isBusy}
        >
          {selected.label ?? selected.value}
        </Dropdown.Toggle>
      </TooltipTrigger>
      <Dropdown.Menu className={styles.menu}>
        {normalizedOptions.map((option) => (
          <Dropdown.Item
            key={option.value}
            eventKey={option.value}
            active={option.value === value}
            className={styles.item}
          >
            <div
              className={option.variant ? VARIANT_CLASSES[option.variant] : ''}
            >
              {option.label ?? option.value}
            </div>
            {option.description && (
              <div
                className={`${styles.description} ${
                  option.variant ? VARIANT_CLASSES[option.variant] : ''
                }`}
              >
                {option.description}
              </div>
            )}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
