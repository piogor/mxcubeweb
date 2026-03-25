import logging

from pydantic.v1 import BaseModel, Field

from mxcubeweb.core.adapter.actuator_adapter import ActuatorAdapterBase
from mxcubeweb.core.models.adaptermodels import (
    HOActuatorModel,
)
from mxcubeweb.core.util.networkutils import RateLimited


class FluxParametersValueModel(BaseModel):
    flux_density: float = Field(
        -1.0,
        description="Flux density in photons/s/µm² at the sample position",
    )
    flux_density_energy: float = Field(
        0.0,
        description="Flux density energy in keV",
    )


class HOFluxParametersModel(HOActuatorModel):
    value: FluxParametersValueModel


hwr_logger = logging.getLogger("MX3.HWR")


class MAXIVFluxParametersAdapter(ActuatorAdapterBase):
    """Adapter for MAXIV Flux parameters Hardware Object.

    A web socket is used to communicate information on longer running processes.
    """

    def __init__(  # noqa: D417
        self,
        ho,
        *args,
    ):
        """Initialize.

        Args:
            ho (object): Hardware object.
        """
        super().__init__(ho, *args)
        self._type = "ACTUATOR"

        try:
            ho.connect("valueChanged", self._value_change)
        except Exception:
            msg = f"Could not connect signal: {ho.name}"
            hwr_logger.exception(msg)

    @RateLimited(6)
    def _value_change(self, *_args, **_kwargs):
        self.value_change(self.get_value().dict()["value"])

    def get_value(self) -> HOFluxParametersModel:
        flux_info_dict = {
            "flux_density": -1.0,
            "flux_density_energy": 0.0,
        }

        flux_info_dict.update(
            {
                "flux_density": self._ho.flux_density,
                "flux_density_energy": self._ho.flux_density_energy,
            }
        )

        return HOFluxParametersModel(value={**flux_info_dict})

    def state(self):
        """Get the state.

        Returns:
            (str): The state
        """
        # The state is an enum, return the name only
        return self._ho.get_state().name

    def stop(self):
        """Stop the execution."""

    def limits(self):
        """Read the limits.

        Returns:
            (tuple): Two floats (min, max) limits.

        Raises:
            ValueError: When limits for any reason can't be retrieved.
        """
        return (0.0, 0.0)

    def read_only(self):
        """The flux parameters are read only.

        Returns:
            (bool): ``True`` if read only, ``False`` if not.
        """
        return True

    def data(self) -> HOFluxParametersModel:
        return HOFluxParametersModel(**self._dict_repr())
