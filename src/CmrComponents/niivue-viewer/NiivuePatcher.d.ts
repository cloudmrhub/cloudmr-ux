import { Niivue as NiivueBase } from "@niivue/niivue";

export {
  CLOUDMR_DEFAULT_VIEW_ZOOM,
  CLOUDMR_INSET_VIEW_ZOOM,
  CLOUDMR_NIIVUE_FIT_ZOOM,
  CLOUDMR_STANDARD_VIEW_ZOOM,
} from "./niivueViewDefaults.js";

export class Niivue extends NiivueBase {
  constructor(options?: any);
  _cloudMrDefaultZoom?: number;
  applyDefaultViewState(): void;
  [key: string]: any;
}
