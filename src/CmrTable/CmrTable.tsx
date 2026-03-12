import React from 'react';
import './CmrTable.css';
import { DataGrid, DataGridProps } from '@mui/x-data-grid';
import { CSSProperties } from 'react';

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

  headerBgColor?: string;
  headerTextColor?: string;
  headerIconColor?: string;

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
    headerBgColor = '#F3E5F5',
    headerTextColor = '#333',
    headerIconColor = '#580f8b',
    processRows,
    ...rest
  } = props;

  const mappedRows = dataSource
    ? dataSource.map((row) => ({
        id: idAlias ? row[idAlias] : row['id'],
        ...row,
      }))
    : [];

  const displayRows = processRows ? processRows(mappedRows) : defaultSortByRecent(mappedRows);

  return (
    <div style={style ?? { height: '400px', width: '100%' }} className={className ?? ''}>
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
        sx={{
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: headerBgColor,
            color: headerTextColor,
          },
          // '& .MuiDataGrid-columnHeaders .MuiSvgIcon-root': {
          //   color: headerIconColor,
          // },

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
        }}
        localeText={{ noRowsLabel: 'No Rows' }}
        {...rest}
      />
    </div>
  );
};

export default CmrTable;
