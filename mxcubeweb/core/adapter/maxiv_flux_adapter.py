import logging
from typing import ClassVar

from mxcubecore.HardwareObjects.MAXIV.BioMAX import BIOMAXFlux

from mxcubeweb.core.adapter.actuator_adapter import ActuatorAdapter
from mxcubeweb.core.adapter.maxiv_flux_parameters_adapter import (
    BioMAXFluxParametersAdapter,
)
from mxcubeweb.core.models.adaptermodels import FloatValueModel
from mxcubeweb.core.models.configmodels import ResourceHandlerConfigModel
from mxcubeweb.core.util.networkutils import RateLimited

resource_handler_config = ResourceHandlerConfigModel(attributes=["data", "get_value"])

hwr_logger = logging.getLogger("MX3.HWR")


class BioMAXFluxAdapter(ActuatorAdapter):
    """Adapter for BioMAX Flux Hardware Object.

    A web socket is used to communicate information on longer running processes.
    """

    SUPPORTED_TYPES: ClassVar[list[object]] = [
        BIOMAXFlux.BIOMAXFlux,
    ]

    def __init__(  # noqa: D417
        self, ho, role, app
    ):
        """Initialize.

        Args:
            ho (object): Hardware object.
        """
        super().__init__(ho, role, app, resource_handler_config)
        super()._add_adapter("flux_parameters", self._ho, BioMAXFluxParametersAdapter)
        self._type = "ACTUATOR"

        try:
            ho.connect("valueChanged", self._value_change)
        except Exception:
            msg = f"Could not connect signal: {ho.name}"
            hwr_logger.exception(msg)

    @RateLimited(6)
    def _value_change(self, *args, **kwargs):
        self.value_change(*args, **kwargs)

    def get_value(self) -> FloatValueModel:
        """Read the flux value.

        Returns:
            (float as str): Flux value.

        Raises:
            ValueError: When value for any reason can't be retrieved.
        """
        try:
            return FloatValueModel(value=self._ho.get_value())
        except (AttributeError, TypeError) as ex:
            msg = "Could not get value"
            raise ValueError(msg) from ex

    def limits(self):
        return (0.0, 0.0)
