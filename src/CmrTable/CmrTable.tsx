import React from 'react';
import './CmrTable.css';
import { DataGrid, DataGridProps } from '@mui/x-data-grid';
import { CSSProperties } from 'react';

export interface CmrTableProps extends Omit<DataGridProps, 'rows'> {
  dataSource: any[];
  idAlias?: string;
  name?: string;
  style?: CSSProperties;
  showCheckbox?: boolean;

  headerBgColor?: string;
  headerTextColor?: string;
  headerIconColor?: string;
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
    ...rest
  } = props;

  return (
    <div style={style ?? { height: '400px', width: '100%' }} className={className ?? ''}>
      <DataGrid
        rows={
          dataSource
            ? dataSource.map((row) => ({
              id: idAlias ? row[idAlias] : row['id'],
              ...row,
            }))
            : []
        }
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
          '& .MuiDataGrid-columnHeaders .MuiSvgIcon-root': {
            color: headerIconColor,
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
