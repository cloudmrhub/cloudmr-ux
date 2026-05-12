import React from 'react';
import './CmrTable.css';
import { DataGrid, DataGridProps } from '@mui/x-data-grid';
import { CSSProperties } from 'react';

/** Default header icon / selection accent (purple). Exposed for host apps that want the package default explicitly. */
export const CMR_TABLE_DEFAULT_HEADER_ICON = '#580f8b';

const DEFAULT_HEADER_BG = '#F3E5F5';
const DEFAULT_HEADER_TEXT = '#333';
/** Unchecked row/header checkbox tint that pairs with {@link CMR_TABLE_DEFAULT_HEADER_ICON}. */
const DEFAULT_CHECKBOX_UNCHECKED = 'rgba(88, 15, 139, 0.54)';

/** Extracts a comparable timestamp from a row for sorting. Supports createdAt, created_at, or similar date fields. */
function getSubmittedTimestamp(row: any): number {
  const val = row.createdAt ?? row.created_at ?? row.updatedAt ?? row.updated_at;
  if (val == null) return 0;
  const ts = typeof val === 'number' ? val : new Date(val).getTime();
  return isNaN(ts) ? 0 : ts;
}

/** Default sort: most recently submitted first (by createdAt or created_at descending). */
function defaultSortByRecent<T extends Record<string, unknown>>(rows: T[]): T[] {
  return [...rows].sort((a, b) => getSubmittedTimestamp(b) - getSubmittedTimestamp(a));
}

export interface CmrTableProps extends Omit<DataGridProps, 'rows'> {
  dataSource: any[];
  idAlias?: string;
  name?: string;
  style?: CSSProperties;
  showCheckbox?: boolean;

  /** Column header background. @default `#F3E5F5` */
  headerBgColor?: string;
  /** Column header text color. @default `#333` */
  headerTextColor?: string;
  /**
   * Sort icons, menu icons, and header “select all” checkbox accent.
   * Also the default for {@link checkboxCheckedColor} when that prop is omitted.
   * @default `#580f8b`
   */
  headerIconColor?: string;
  /**
   * Row / header checkbox color when checked or indeterminate.
   * @default same as `headerIconColor` (`#580f8b` when defaults apply)
   */
  checkboxCheckedColor?: string;
  /**
   * Row / header checkbox color when unchecked (non-checked outline state).
   * @default `rgba(88, 15, 139, 0.54)` (pairs with default purple accent)
   */
  checkboxUncheckedColor?: string;

  /**
   * Optional function to customize how rows are filtered/sorted before display.
   * Receives the mapped rows; return a new array in the desired order.
   * When omitted, rows are sorted by most recently submitted (createdAt/created_at descending).
   */
  processRows?: (rows: any[]) => any[];
}

const CmrTable: React.FC<CmrTableProps> = (props) => {
  const {
    dataSource,
    columns,
    idAlias,
    className,
    onRowSelectionModelChange,
    style,
    showCheckbox = true,
    headerBgColor = DEFAULT_HEADER_BG,
    headerTextColor = DEFAULT_HEADER_TEXT,
    headerIconColor = CMR_TABLE_DEFAULT_HEADER_ICON,
    checkboxCheckedColor,
    checkboxUncheckedColor,
    processRows,
    sx: userSx,
    ...rest
  } = props;

  const resolvedCheckboxChecked = checkboxCheckedColor ?? headerIconColor;
  const resolvedCheckboxUnchecked = checkboxUncheckedColor ?? DEFAULT_CHECKBOX_UNCHECKED;

  const wrapperStyle: CSSProperties = {
    height: '400px',
    width: '100%',
    ...(style ?? {}),
    // CSS var API for advanced customization without prop drilling
    ['--cmr-table-header-bg' as string]: headerBgColor,
    ['--cmr-table-header-text' as string]: headerTextColor,
    ['--cmr-table-header-icon' as string]: headerIconColor,
    ['--cmr-table-checkbox-checked' as string]: resolvedCheckboxChecked,
    ['--cmr-table-checkbox-unchecked' as string]: resolvedCheckboxUnchecked,
  };

  const tableClassName = ['cmr-table', className].filter(Boolean).join(' ');

  const mappedRows = dataSource
    ? dataSource.map((row) => ({
        id: idAlias ? row[idAlias] : row['id'],
        ...row,
      }))
    : [];

  const displayRows = processRows ? processRows(mappedRows) : defaultSortByRecent(mappedRows);

  const baseSx: DataGridProps['sx'] = {
    '& .MuiDataGrid-columnHeaders': {
      backgroundColor: headerBgColor,
      color: headerTextColor,
    },
    '&& .MuiDataGrid-columnHeader .MuiSvgIcon-root': {
      color: `${headerIconColor} !important`,
    },
    '&& .MuiDataGrid-columnHeader .MuiDataGrid-sortIcon': {
      color: `${headerIconColor} !important`,
    },
    '&& .MuiDataGrid-columnHeader .MuiDataGrid-menuIconButton .MuiSvgIcon-root': {
      color: `${headerIconColor} !important`,
    },
    '&& .MuiDataGrid-columnHeader .MuiDataGrid-iconButtonContainer .MuiSvgIcon-root': {
      color: `${headerIconColor} !important`,
    },
    '& .MuiDataGrid-columnHeaderTitle': {
      fontWeight: 'bold',
    },
  };

  const mergedSx: DataGridProps['sx'] =
    userSx == null
      ? baseSx
      : Array.isArray(userSx)
        ? [baseSx, ...userSx]
        : [baseSx, userSx];

  return (
    <div style={wrapperStyle} className={tableClassName}>
      <DataGrid
        rows={displayRows}
        columns={columns}
        checkboxSelection={showCheckbox}
        onRowSelectionModelChange={onRowSelectionModelChange}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 50, page: 0 },
          },
        }}
        sx={mergedSx}
        localeText={{ noRowsLabel: 'No Rows' }}
        {...rest}
      />
    </div>
  );
};

export default CmrTable;
