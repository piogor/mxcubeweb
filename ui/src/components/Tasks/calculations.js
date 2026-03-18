/**
 * Preset experimental goals supported by the Biomax dose calculator UI.
 *
 * @type {string[]}
 */
export const DOSE_EXPERIMENTAL_GOALS = [
  'Cryo High Resolution',
  'Room Temperature',
  'Cys-Cys',
  'S-SAD',
  'MAD/SAD',
  'Custom',
];

/**
 * @typedef {Object} DoseCalculationContext
 * @property {boolean} doseCalculationEnabled
 * @property {number} transmission
 * @property {number} exposureTime
 * @property {number} numberImages
 * @property {number} doseLimit
 * @property {number} userEnergy
 * @property {number} fluxDensityEnergy
 * @property {number} beamlineEnergy
 * @property {number} fluxCurrent
 * @property {number} baseFluxDensity
 * @property {number} wavelength
 * @property {*} resolutionLimits
 */

/**
 * @typedef {Object} DoseValuesResult
 * @property {number} estimatedDose
 * @property {number} maxImages
 * @property {string} noEstimatedDose
 * @property {string} noMaxImage
 */

/**
 * @typedef {Object} DoseColorResult
 * @property {{color: string}} doseColor
 * @property {{color: string}} maxImgColor
 */

/**
 * Maps an experimental goal to the corresponding initial dose-limit preset.
 *
 * @param {string} goal - Selected experimental goal label.
 * @param {number} initResolution - Current resolution value from the form.
 * @returns {{nextDoseLimit: number | null, nextResolution: number | null}}
 */
export function getExperimentalGoalPreset(goal, initResolution) {
  let nextDoseLimit = null;
  let nextResolution = null;

  switch (goal) {
    case 'Cryo High Resolution': {
      nextDoseLimit = initResolution * 10;
      nextResolution = initResolution;
      break;
    }
    case 'Room Temperature': {
      nextDoseLimit = 0.2;
      nextResolution = initResolution;
      break;
    }
    case 'Cys-Cys': {
      nextDoseLimit = 2;
      nextResolution = initResolution;
      break;
    }
    case 'S-SAD': {
      nextDoseLimit = 5;
      nextResolution = initResolution;
      break;
    }
    case 'MAD/SAD': {
      nextDoseLimit = 6;
      nextResolution = initResolution;
      break;
    }
    case 'Custom': {
      nextResolution = initResolution;
      break;
    }
    default: {
      break;
    }
  }

  return { nextDoseLimit, nextResolution };
}

/**
 * Derives the dose limit from the selected resolution for the cryogenic preset.
 *
 * @param {string} goal - Selected experimental goal label.
 * @param {string | number} resolutionValue - Resolution field value.
 * @returns {number | null}
 */
export function getDoseLimitFromResolutionGoal(goal, resolutionValue) {
  if (goal !== 'Cryo High Resolution') {
    return null;
  }

  const resolution = Number.parseFloat(resolutionValue);
  if (!Number.isFinite(resolution)) {
    return null;
  }

  return resolution * 10;
}

/**
 * Evaluates the beamline-specific polynomial used to estimate flux at a given energy.
 *
 * @param {number} energy - Energy in eV.
 * @returns {number}
 */
export function getFluxTCurrent(energy) {
  let coeff = [];
  if (energy < 9060) {
    coeff = [1.409_19e14, -6.959_09e10, 1.106_38e7, -5.537_74e2];
  } else if (energy < 12_610) {
    coeff = [1.409_19e14, -6.959_09e10, 1.106_38e7, -5.537_74e2];
  } else if (energy < 18_750) {
    coeff = [1.593_63e14, -2.786_13e10, 1.694_24e6, -3.505_71e1];
  } else if (energy < 20_400) {
    coeff = [1.002_06e12, 2.654_77e9, -2.400_59e5, 5.445_78];
  } else if (energy <= 24_000) {
    coeff = [5.063_78e14, -6.525_03e10, 2.815_65e6, -4.062_89e1];
  } else {
    coeff = [0, 0, 0, 0];
  }

  return (
    coeff[0] +
    coeff[1] * energy +
    coeff[2] * energy ** 2 +
    coeff[3] * energy ** 3
  );
}

/**
 * Interpolates the resolution for a user-selected energy using the current beamline
 * energy and resolution values.
 *
 * @param {number} userEnergy - User-selected energy.
 * @param {number} beamlineEnergy - Current beamline energy.
 * @param {number} resolution - Current beamline resolution.
 * @returns {string}
 */
export function interpolateResolutionForEnergy(
  userEnergy,
  beamlineEnergy,
  resolution,
) {
  if (userEnergy === 0) {
    return 'N/A';
  }

  const interpolated = (resolution * beamlineEnergy) / userEnergy;

  if (!Number.isFinite(interpolated)) {
    return 'N/A';
  }

  return interpolated.toFixed(2);
}

/**
 * Normalizes form values and beamline state into a single object used by dose helpers.
 *
 * @param {Object} state - Redux state slice containing beamline data.
 * @param {Object} dataCollectionValues - Form values from the data-collection task.
 * @returns {DoseCalculationContext}
 */
export function getDoseCalculationContext(state, dataCollectionValues) {
  const beamline = state.beamline || {};
  const hardwareObjects = beamline.hardwareObjects || {};

  const doseCalculationEnabled = 'flux.flux_parameters' in hardwareObjects;

  const transmission = Number.parseFloat(dataCollectionValues.transmission);
  const exposureTime = Number.parseFloat(dataCollectionValues.exp_time);
  const numberImages = Number.parseFloat(dataCollectionValues.num_images);
  const doseLimit = Number.parseFloat(dataCollectionValues.dose_limit);
  const userEnergy = Number.parseFloat(dataCollectionValues.energy);

  const beamlineEnergy = Number.parseFloat(hardwareObjects.energy.value);

  const baseFluxDensity = Number.parseFloat(
    hardwareObjects['flux.flux_parameters']?.value.flux_density || -1,
  );
  const fluxDensityEnergy = Number.parseFloat(
    hardwareObjects['flux.flux_parameters']?.value.flux_density_energy || 0,
  );
  const fluxCurrent = Number.parseFloat(hardwareObjects.flux.value);

  const wavelengthRaw = Number.parseFloat(
    hardwareObjects['energy.wavelength'].value,
  );

  let wavelength = Number.NaN;
  if (Number.isFinite(wavelengthRaw)) {
    wavelength = Math.min(3, Math.max(0.5, wavelengthRaw));
  }

  const resolutionLimits = hardwareObjects.resolution.limits;

  return {
    doseCalculationEnabled,
    transmission,
    exposureTime,
    numberImages,
    doseLimit,
    userEnergy,
    fluxDensityEnergy,
    beamlineEnergy,
    fluxCurrent,
    baseFluxDensity,
    wavelength,
    resolutionLimits,
  };
}

/**
 * Calculates estimated dose and image limits for the current acquisition settings.
 *
 * @param {DoseCalculationContext} context - Parsed numeric values used by the dose model.
 * @returns {DoseValuesResult}
 */
export function calculateDoseValues(context) {
  const {
    baseFluxDensity,
    transmission,
    wavelength,
    exposureTime,
    numberImages,
    doseLimit,
    fluxDensityEnergy,
    userEnergy,
  } = context;

  if (
    !Number.isFinite(baseFluxDensity) ||
    !Number.isFinite(transmission) ||
    !Number.isFinite(wavelength)
  ) {
    return {
      estimatedDose: Number.NaN,
      maxImages: Number.NaN,
      noEstimatedDose: 'N/A',
      noMaxImage: 'N/A',
    };
  }

  const fluxDensity = (baseFluxDensity * transmission) / 100;
  const doseRate = fluxDensity / (2000 / wavelength / wavelength);

  const estimatedDose =
    Number.isFinite(doseRate) &&
    doseRate > 0 &&
    Number.isFinite(exposureTime) &&
    exposureTime > 0 &&
    Number.isFinite(numberImages)
      ? (doseRate * exposureTime * numberImages) / 1_000_000
      : Number.NaN;

  const maxImages =
    Number.isFinite(doseRate) &&
    doseRate > 0 &&
    Number.isFinite(exposureTime) &&
    exposureTime > 0 &&
    Number.isFinite(doseLimit)
      ? (doseLimit * 1_000_000) / doseRate / exposureTime
      : Number.NaN;

  const isAvailable =
    Number.isFinite(baseFluxDensity) &&
    baseFluxDensity > 0 &&
    Number.isFinite(fluxDensityEnergy) &&
    Number.isFinite(userEnergy) &&
    Math.abs(fluxDensityEnergy - userEnergy) <= 50;

  return {
    estimatedDose,
    maxImages,
    noEstimatedDose: isAvailable ? '' : 'N/A',
    noMaxImage: isAvailable ? '' : 'N/A',
  };
}

/**
 * Calculates the flux expected at the user-selected energy.
 *
 * @param {DoseCalculationContext} context - Parsed numeric values used by the flux model.
 * @returns {string}
 */
export function calculateFluxValue(context) {
  const { fluxCurrent, beamlineEnergy, userEnergy } = context;
  const fluxAtBeamlineEnergy = getFluxTCurrent(beamlineEnergy);

  if (
    !Number.isFinite(fluxCurrent) ||
    fluxCurrent <= 0 ||
    !Number.isFinite(beamlineEnergy) ||
    !Number.isFinite(userEnergy) ||
    !Number.isFinite(fluxAtBeamlineEnergy) ||
    fluxAtBeamlineEnergy <= 0
  ) {
    return 'N/A';
  }

  const scale = fluxAtBeamlineEnergy / fluxCurrent;
  const userFlux = getFluxTCurrent(userEnergy) / scale;
  return Number.isFinite(userFlux) ? userFlux.toExponential(1) : 'N/A';
}

/**
 * Determines the UI colors for dose and maximum-image indicators.
 *
 * @param {DoseValuesResult & {doseLimit: number, numberImages: number}} params
 * @returns {DoseColorResult}
 */
export function calculateDoseColors({
  noEstimatedDose,
  noMaxImage,
  estimatedDose,
  doseLimit,
  numberImages,
  maxImages,
}) {
  return {
    doseColor: {
      color:
        noEstimatedDose === 'N/A' ||
        noMaxImage === 'N/A' ||
        (Number.isFinite(estimatedDose) &&
          Number.isFinite(doseLimit) &&
          estimatedDose > doseLimit)
          ? 'red'
          : 'green',
    },
    maxImgColor: {
      color:
        noMaxImage === 'N/A' ||
        (Number.isFinite(numberImages) &&
          Number.isFinite(maxImages) &&
          numberImages > maxImages)
          ? 'red'
          : 'green',
    },
  };
}
