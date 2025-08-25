/* eslint-disable react/destructuring-assignment */
import './style.css';

import JSForm from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';
import React from 'react';
import { Button, ButtonToolbar, Col, Form, Modal, Row } from 'react-bootstrap';
import { connect } from 'react-redux';
import { formValueSelector, reduxForm } from 'redux-form';

import { getEstimatedTime, sendUpdateDependentFields } from '../../api/queue';
import { DraggableModal } from '../DraggableModal';
import CustomFieldErrorTemplate from './CustomFieldErrorTemplate';
import CustomFieldTemplate from './CustomFieldTemplate';
import CustomObjectFieldTemplate from './CustomObjectFieldTemplate';
import {
  InputField,
  resetLastUsedParameters,
  saveToLastUsedParameters,
  StaticField,
  toFixed,
} from './fields';
import styles from './GenericTaskForm.module.css';
import validate from './validate';
import warn from './warning';
import CheckboxWidget from './Widgets/CheckboxWidget/CheckboxWidget';

class GenericTaskForm extends React.Component {
  constructor(props) {
    super(props);

    this.submitAddToQueue = this.submitAddToQueue.bind(this);
    this.showFooter = this.showFooter.bind(this);
    this.showDCFooter = this.showDCFooter.bind(this);
    this.showDPFooter = this.showDPFooter.bind(this);
    this.submitRunNow = this.submitRunNow.bind(this);
    this.addToQueue = this.addToQueue.bind(this);
    this.defaultParameters = this.defaultParameters.bind(this);
    this.state = {
      rjsfErrors: [],
      estimatedTimeString: '',
    };
    this.jsformData = {};
  }

  get jsFormStorageKey() {
    return `current${this.props.taskData.type}Parameters`;
  }

  get isFormValid() {
    return this.props.valid && this.state.rjsfErrors.length === 0;
  }

  submitAddToQueue() {
    this.props.handleSubmit(this.addToQueue.bind(this, false))();
  }

  submitRunNow() {
    this.props.handleSubmit(this.addToQueue.bind(this, true))();
  }

  clearCurrentJSFormParameters() {
    localStorage.removeItem(this.jsFormStorageKey);
  }

  saveCurrentJSFormParameters(formData) {
    localStorage.setItem(this.jsFormStorageKey, JSON.stringify(formData));
  }

  addToQueue(runNow, params) {
    const parameters = {
      ...params,
      ...this.jsformData,
      label: params.name,
      shape: this.props.pointID,
      selection: this.props.taskData.parameters.selection,
      experiment_name: params.experimentName,
    };

    // Form gives us all parameter values in strings so we need to transform numbers back
    const stringFields = [
      'shutterless',
      'inverse_beam',
      'centringMethod',
      'detector_roi_mode',
      'space_group',
      'prefix',
      'subdir',
      'type',
      'shape',
      'label',
      'helical',
      'selection',
      'experiment_name',
      'chip_type',
      'beam_size',
    ];

    saveToLastUsedParameters(this.props.taskData.type, parameters, [
      'selection',
    ]);
    this.clearCurrentJSFormParameters();
    this.props.addTask(parameters, stringFields, runNow);
    this.props.hide();
  }

  defaultParameters() {
    this.clearCurrentJSFormParameters();
    resetLastUsedParameters(this);
  }

  showDCFooter() {
    return (
      <Modal.Footer>
        <div className="input-group-btn d-flex">
          <ButtonToolbar
            style={{ bottom: '15px', left: '10px' }}
            className="position-absolute"
          >
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={this.defaultParameters}
            >
              Default Parameters
            </Button>
          </ButtonToolbar>
          <ButtonToolbar>
            {this.state.estimatedTimeString !== '' && (
              <div className="me-3">
                Estimated Time: {this.state.estimatedTimeString}
              </div>
            )}
            <Button
              className="me-3 ms-3"
              size="sm"
              variant="success"
              disabled={!this.isFormValid}
              onClick={this.submitRunNow}
            >
              Run Now
            </Button>
            <Button
              size="sm"
              variant="outline-secondary"
              disabled={!this.isFormValid}
              onClick={this.submitAddToQueue}
            >
              {this.props.taskData.sampleID ? 'Change' : 'Add to Queue'}
            </Button>
          </ButtonToolbar>
        </div>
      </Modal.Footer>
    );
  }

  showDPFooter() {
    return (
      <Modal.Footer>
        <ButtonToolbar className="float-end">
          <Button
            className="me-3"
            variant="success"
            disabled={!this.isFormValid}
            onClick={this.submitRunNow}
          >
            Run Now
          </Button>
          <Button
            variant="primary"
            disabled={!this.isFormValid}
            onClick={this.submitAddToQueue}
          >
            Add Collection Plan to Queue
          </Button>
        </ButtonToolbar>
      </Modal.Footer>
    );
  }

  showFooter() {
    const { isDiffractionPlan } = this.props.taskData;
    let foot = '';
    if (isDiffractionPlan) {
      foot = this.showDPFooter();
    } else {
      foot = this.showDCFooter();
    }
    return foot;
  }

  setConstraintsFromDefualts(schema) {
    const s = { ...schema };

    for (const key in this.props.initialValues) {
      if (s.properties[key]) {
        s.properties[key].default = this.props.initialValues[key];
      }
    }

    const currentFormData = JSON.parse(
      localStorage.getItem(this.jsFormStorageKey),
    );

    if (currentFormData) {
      for (const key in currentFormData) {
        if (s.properties[key]) {
          s.properties[key].default = currentFormData[key];
        }
      }
    }

    for (const key in this.props.taskData.Arraylimits) {
      if (s.properties[key]) {
        s.properties[key].exclusiveMinimum = this.props.taskData.limits[key][0];
        s.properties[key].exclusiveMaximum = this.props.taskData.limits[key][1];
      }
    }

    return s;
  }

  /**
   * Make the input element flash to indicate it has been updated
   *
   * @param {Element} element - the input, which we want to highlight
   */
  flash(element) {
    element.classList.remove(styles.updated);
    // makes sure that the removal of the class is processed before adding it back
    // the offsetWidth is dependent on the layout, thus reading it makes the browser
    // abandon optimizing DOM changes by batching them.
    void element.offsetWidth;

    element.classList.add(styles.updated);
  }

  /**
   *
   * @param {Object} formData - form data from JSForm
   * @param {string} updatedFieldName - id of the field that changed
   */
  updateFromRemoteValidation(formData, updatedFieldName) {
    // eslint-disable-next-line promise/catch-or-return
    sendUpdateDependentFields(
      this.props.taskData.type,
      formData,
      updatedFieldName,
      // eslint-disable-next-line promise/prefer-await-to-then
    ).then((_d) => {
      const data = JSON.parse(_d);
      // eslint-disable-next-line guard-for-in
      for (const fieldName in data) {
        this.jsformData[fieldName] = data[fieldName];
        const el = document.querySelector(`#root_${fieldName}`);
        if (el !== null) {
          el.value = data[fieldName];
          this.flash(el);
        }
      }
      this.updateEstimatedTime(this.jsformData);
    });
  }

  /**
   * Update the estimated time for the task based on the current form data
   *
   * The estimated time is fetched from the queue entry and displayed in the footer
   * of the JSForm. It follows HH:MM:SS format.
   *
   * @param {Object} formData - form data from JSForm
   * @returns {Promise<void>}
   */
  async updateEstimatedTime(formData) {
    let estimatedTimeInSeconds = 0;
    try {
      estimatedTimeInSeconds = await getEstimatedTime(
        this.props.taskData.type,
        formData,
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching estimated time:', error);
      estimatedTimeInSeconds = 0;
    }

    if (estimatedTimeInSeconds === 0) {
      this.setState({ estimatedTimeString: '' });
      return;
    }
    const estimatedTimeString = `
      ${String(Math.floor(estimatedTimeInSeconds / 3600)).padStart(2, '0')}:
      ${String(Math.floor(estimatedTimeInSeconds / 60) % 60).padStart(2, '0')}:
      ${String(estimatedTimeInSeconds % 60).padStart(2, '0')}
    `
      // removes whitespaces, caused by the template literal spanning multiple lines
      .replaceAll(/\s+/gu, '')
      .trim();

    this.setState({ estimatedTimeString });
  }

  render() {
    const uiSchema = JSON.parse(this.props.uiSchema);
    const schema = this.setConstraintsFromDefualts(
      this.props.schema.user_collection_parameters,
    );

    return (
      <DraggableModal
        show={this.props.show}
        onHide={() => {
          this.clearCurrentJSFormParameters();
          this.props.hide();
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>{this.props.taskData.parameters.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <StaticField label="Path" data={this.props.path} />
            <StaticField label="Filename" data={this.props.filename} />
            <Row className="mb-2">
              <Col xs={12} style={{ marginTop: '10px' }}>
                <InputField
                  disabled
                  propName="subdir"
                  label="Sample name"
                  col1="2"
                  col2="8"
                />
              </Col>
            </Row>
            <Row>
              {this.props.useExperimentName ? (
                <Col xs={6} style={{ marginBottom: '10px' }}>
                  <InputField
                    propName="experimentName"
                    label="Experiment Name"
                    col1="4"
                    col2="6"
                  />
                </Col>
              ) : null}
              <Col xs={12}>
                <InputField
                  propName="prefix"
                  label="Prefix"
                  col1="2"
                  col2="8"
                />
              </Col>
              {this.props.taskData.sampleID ? (
                <Col xs={8}>
                  <InputField
                    propName="run_number"
                    disabled
                    label="Run number"
                    col1="4"
                    col2="3"
                  />
                </Col>
              ) : null}
            </Row>
          </Form>

          <div className="json-schema-form-container">
            <JSForm
              liveValidate
              validator={validator}
              schema={schema}
              uiSchema={uiSchema}
              formData={this.jsformData}
              showErrorList={false}
              onChange={({ formData, errors }, fieldId) => {
                // id will be in the form of root_<fieldName>
                // as root_ is the prefix used by JSForm for the field IDs
                const fieldName = fieldId?.replace('root_', '');
                this.updateFromRemoteValidation(formData, fieldName);
                this.saveCurrentJSFormParameters(formData);
                this.jsformData = formData;
                this.setState({ rjsfErrors: errors });
              }}
              templates={{
                ObjectFieldTemplate: CustomObjectFieldTemplate,
                FieldTemplate: CustomFieldTemplate,
                FieldErrorTemplate: CustomFieldErrorTemplate,
              }}
              widgets={{
                CheckboxWidget,
              }}
            />
          </div>
        </Modal.Body>

        {this.props.taskData.state ? '' : this.showFooter()}
      </DraggableModal>
    );
  }
}

const GenericTaskFormForm = reduxForm({
  form: 'GenericTaskForm',
  validate,
  warn,
})(GenericTaskForm);

const selector = formValueSelector('GenericTaskForm');

export default connect((state) => {
  const subdir = selector(state, 'subdir');
  const experimentNameSelector = selector(state, 'experimentName');
  let position = state.taskForm.pointID === '' ? 'PX' : state.taskForm.pointID;
  if (typeof position === 'object') {
    const vals = Object.values(position).sort();
    position = `[${vals}]`;
  }

  let fname = '';

  if (state.taskForm.sampleID) {
    fname = state.taskForm.taskData.parameters.fileName;
  } else {
    const prefix = selector(state, 'prefix');
    fname = `${prefix}_[RUN#]_[IMG#]`;
  }

  const { type } = state.taskForm.taskData;
  const { limits } = state.taskForm.defaultParameters[type];
  const { schema } = state.taskForm.defaultParameters[type];
  const uiSchema = state.taskForm.defaultParameters[type].ui_schema;
  const useExperimentName =
    state.taskForm.taskData.parameters.use_experiment_name;

  let path = `${state.login.rootPath}/${subdir}${experimentNameSelector}/[RUN#]`;

  if (!useExperimentName) {
    path = `${state.login.rootPath}/${subdir}/[RUN#]`;
  }

  return {
    path,
    filename: fname,
    experimentName: experimentNameSelector,
    subdir,
    acqParametersLimits: limits,
    useExperimentName,
    schema,
    uiSchema,
    beamline: state.beamline,
    components: state.uiproperties.sample_view_motors.components,
    initialValues: {
      ...state.taskForm.taskData.parameters,
      type,
      beam_size: state.sampleview.currentAperture,
      resolution: toFixed(state, 'resolution'),
      energy: toFixed(state, 'energy'),
      transmission: toFixed(state, 'transmission'),
      osc_start: toFixed(state, 'diffractometer.omega', 'osc_start'),
    },
  };
})(GenericTaskFormForm);
