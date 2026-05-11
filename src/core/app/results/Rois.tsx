import { NiivueRoiTable } from "../../../CmrComponents/niivue-roi-table/NiivueRoiTable";
import type { NiivueRoiTableProps } from "../../../CmrComponents/niivue-roi-table/NiivueRoiTable";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { getPipelineROI } from "../../features/rois/resultActionCreation";

export type { NiivueRoiTableProps };

type ReduxRoiTableProps = Omit<NiivueRoiTableProps, "onAfterRoiUpload">;

/**
 * ROI table wired to the core Redux store: refreshes pipeline ROI metadata after upload.
 * Prefer {@link NiivueRoiTable} from `cloudmr-ux` when building screens without this store.
 */
export function ROITable(props: ReduxRoiTableProps) {
  const pipeline = useAppSelector((s) => s.result.activeJob?.pipeline_id);
  const dispatch = useAppDispatch();

  return (
    <NiivueRoiTable
      {...props}
      onAfterRoiUpload={() => {
        const p = pipeline ?? props.pipelineID;
        if (p) {
          void dispatch(getPipelineROI({ pipeline: p }));
        }
      }}
    />
  );
}
