import get from 'lodash/get';
import groupBy from 'lodash/groupBy';
import isEmpty from 'lodash/isEmpty';
import mapValues from 'lodash/mapValues';

import { CollapsableRows, FieldsHeader } from './fields';
/**
 * @param {import('@rjsf/utils').ObjectFieldTemplateProps} props
 * @returns {JSX.Element}
 */
export default function CustomObjectFieldTemplate({
  properties,
  uiSchema = {},
}) {
  /**
   * The fields in UiSchema may have a `ui:options.group` property
   * that indicates which group the field belongs to.
   * It may as well have 'row' property that indicates which row the field belongs to.
   * It will be useful for us to map the fields to their respective groups and rows.
   * If a field does not have a group, it will be placed in the "ungrouped" section.
   * If a field does not have a row, it will be placed in the last row of its group.
   */
  const groupToRows = mapValues(
    groupBy(properties, (field) =>
      get(uiSchema, [field.name, 'ui:options', 'group'], 'Acquisition'),
    ),
    (fieldsInGroup) =>
      groupBy(fieldsInGroup, (field) =>
        get(uiSchema, [field.name, 'ui:options', 'row_id'], 'last'),
      ),
  );

  const { Acquisition: acquisitionGroup = {}, ...otherGroups } = groupToRows;

  return (
    <div>
      {!isEmpty(acquisitionGroup) > 0 && (
        <>
          <FieldsHeader title="Acquisition" />
          {Object.entries(acquisitionGroup).map(([rowName, fields]) => (
            <div key={rowName} className="row">
              {fields.map(({ content }) => content)}
            </div>
          ))}
        </>
      )}
      {Object.entries(otherGroups).map(([groupName, groupRows]) => (
        <div key={groupName}>
          <FieldsHeader title={groupName} />
          <CollapsableRows title={groupName}>
            {Object.entries(groupRows).map(([rowName, fields]) => (
              <div key={rowName} className="row">
                {fields.map(({ content }) => content)}
              </div>
            ))}
          </CollapsableRows>
        </div>
      ))}
    </div>
  );
}
